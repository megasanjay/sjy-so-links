<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";
import { useToast, useDayjs } from "#imports";
import { useSeoMeta, useFetch } from "#app";
import { definePageMeta } from "#app/composables/pages";
import { computed, onMounted, reactive, ref } from "vue";
import { watchDebounced } from "@vueuse/core";
import { $fetch } from "#build/fetch";
import {
  NuxtLink,
  UButton,
  UContainer,
  UFormField,
  UIcon,
  UInput,
  UModal,
  UPageHeader,
  USwitch,
  UTable,
  UTextarea,
  UTooltip,
} from "#components";
import { SHORT_DOMAIN, SLUG_PATTERN, RESERVED_SLUGS } from "#shared/utils/slug";
import type { UrlCheck } from "#shared/utils/urlCheck";
import { domainProblem } from "#shared/utils/domain";
import { checkSpacedByHost } from "#shared/utils/spacedByHost";

definePageMeta({
  middleware: ["auth"],
});

useSeoMeta({
  title: "Links",
});

const toast = useToast();
const dayjs = useDayjs();

const { data: links, refresh, status } = await useFetch("/api/links");

type LinkRow = NonNullable<typeof links.value>[number];

const search = ref("");

const filteredLinks = computed(() => {
  const q = search.value.trim().toLowerCase();

  if (!q) return links.value ?? [];

  return (links.value ?? []).filter(
    (link) =>
      link.slug.includes(q) ||
      link.url.toLowerCase().includes(q) ||
      link.description.toLowerCase().includes(q),
  );
});

const columns: TableColumn<LinkRow>[] = [
  { accessorKey: "slug", header: "Short link" },
  { accessorKey: "url", header: "Destination" },
  { accessorKey: "clickCount", header: "Clicks" },
  { accessorKey: "lastClicked", header: "Last click" },
  { accessorKey: "enabled", header: "Enabled" },
  { accessorKey: "listed", header: "In sitemap" },
  { id: "actions", header: "" },
];

const errorMessage = (error: unknown) =>
  (error as { data?: { statusMessage?: string } }).data?.statusMessage ??
  "Request failed";

// --- Destination checks ----------------------------------------------------

const checkIcons: Record<UrlCheck["status"], { icon: string; class: string }> =
  {
    error: { class: "text-error", icon: "i-lucide-circle-x" },
    ok: { class: "text-success", icon: "i-lucide-circle-check" },
    warn: { class: "text-warning", icon: "i-lucide-triangle-alert" },
  };

// Results keyed by link id. Filled after the page loads so slow destinations
// don't hold up rendering the table.
const linkChecks = ref<Record<string, UrlCheck>>({});
const checkingAll = ref(false);

/**
 * Cheap first pass from the browser. CORS hides the response, so this only
 * proves the site is reachable (DNS resolves, the server answers); it can't
 * see a 404. Anything that fails here goes to the server for a full check.
 */
const browserCheck = async (url: string) => {
  try {
    const { hostname, protocol } = new URL(url);

    // Apply the same real-domain rules as the server, and skip http:// links
    // on an https page since the browser blocks them as mixed content
    if (domainProblem(hostname)) return false;
    if (protocol === "http:" && window.location.protocol === "https:")
      return false;

    await fetch(url, {
      cache: "no-store",
      credentials: "omit",
      mode: "no-cors",
      referrerPolicy: "no-referrer",
      signal: AbortSignal.timeout(8000),
    });

    return true;
  } catch {
    return false;
  }
};

const checkAllLinks = async () => {
  const all = links.value ?? [];

  if (all.length === 0) return;

  checkingAll.value = true;
  linkChecks.value = {};

  const idsByUrl = new Map<string, string[]>();

  for (const link of all) {
    idsByUrl.set(link.url, [...(idsByUrl.get(link.url) ?? []), link.id]);
  }

  const setResult = (ids: string[], check: UrlCheck) => {
    linkChecks.value = {
      ...linkChecks.value,
      ...Object.fromEntries(ids.map((id) => [id, check])),
    };
  };

  try {
    // Pass 1: browser, filling in icons as each host answers
    const reachable = await checkSpacedByHost(idsByUrl.keys(), async (url) => {
      const ok = await browserCheck(url);

      if (ok) {
        setResult(idsByUrl.get(url)!, {
          message: "Reachable from your browser",
          status: "ok",
        });
      }

      return ok;
    });

    // Pass 2: server double-checks whatever the browser couldn't reach
    const failedIds = [...reachable]
      .filter(([, ok]) => !ok)
      .flatMap(([url]) => idsByUrl.get(url)!);

    for (let i = 0; i < failedIds.length; i += 500) {
      const results = await $fetch("/api/links/check-batch", {
        body: { ids: failedIds.slice(i, i + 500) },
        method: "POST",
      });

      linkChecks.value = { ...linkChecks.value, ...results };
    }

    const broken = Object.values(linkChecks.value).filter(
      (check) => check.status === "error",
    ).length;

    if (broken > 0) {
      toast.add({
        color: "error",
        icon: "i-lucide-circle-x",
        title: `${broken} link${broken === 1 ? "" : "s"} no longer resolve${broken === 1 ? "s" : ""}`,
      });
    }
  } catch (error) {
    toast.add({
      color: "error",
      description: errorMessage(error),
      title: "Could not check links",
    });
  } finally {
    checkingAll.value = false;
  }
};

onMounted(checkAllLinks);

// --- Create / edit modal -------------------------------------------------

const modalOpen = ref(false);
const saving = ref(false);
const editingId = ref<string | null>(null);

const form = reactive({
  description: "",
  enabled: true,
  listed: true,
  slug: "",
  url: "",
});

const slugError = computed(() => {
  const slug = form.slug.trim().toLowerCase();

  if (!slug) return undefined;
  if (RESERVED_SLUGS.has(slug)) return "This path is reserved by the app";
  if (!SLUG_PATTERN.test(slug))
    return "Use lowercase letters, digits, - and _ (max 64)";

  return undefined;
});

// Live check of the destination URL while the form is open
const urlCheck = ref<UrlCheck | null>(null);
const checkingUrl = ref(false);
let urlCheckId = 0;

const isHttpUrl = (value: string) => {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
};

watchDebounced(
  () => [modalOpen.value, form.url] as const,
  async ([open, value]) => {
    const id = ++urlCheckId;
    const url = value.trim();

    urlCheck.value = null;

    if (!open || !url) return;

    if (!isHttpUrl(url)) {
      urlCheck.value = {
        message: "Enter a full http:// or https:// URL",
        status: "error",
      };

      return;
    }

    checkingUrl.value = true;

    try {
      const result = await $fetch("/api/links/check", {
        body: { url },
        method: "POST",
      });

      // Ignore results for a URL the user has since changed
      if (id === urlCheckId) urlCheck.value = result;
    } catch (error) {
      if (id === urlCheckId) {
        urlCheck.value = { message: errorMessage(error), status: "error" };
      }
    } finally {
      if (id === urlCheckId) checkingUrl.value = false;
    }
  },
  { debounce: 500 },
);

const randomSlug = () => {
  // No look-alike characters: 0/o, 1/i/l/j, 2/z, 5/s, 8/b, 9/g/q, u/v
  const alphabet = "acdefhkmnprtwxy3467";
  const bytes = crypto.getRandomValues(new Uint8Array(6));

  form.slug = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
};

const openCreate = () => {
  editingId.value = null;
  Object.assign(form, {
    description: "",
    enabled: true,
    listed: true,
    slug: "",
    url: "",
  });
  modalOpen.value = true;
};

const openEdit = (link: LinkRow) => {
  editingId.value = link.id;
  Object.assign(form, {
    description: link.description,
    enabled: link.enabled,
    listed: link.listed,
    slug: link.slug,
    url: link.url,
  });
  modalOpen.value = true;
};

const save = async () => {
  if (slugError.value) return;

  if (checkingUrl.value || urlCheck.value?.status === "error") return;

  saving.value = true;

  try {
    let id: string;

    if (editingId.value) {
      id = editingId.value;
      await $fetch(`/api/links/${id}`, { body: form, method: "PATCH" });
    } else {
      ({ id } = await $fetch("/api/links", { body: form, method: "POST" }));
    }

    if (urlCheck.value) {
      linkChecks.value = { ...linkChecks.value, [id]: urlCheck.value };
    }

    toast.add({
      color: "success",
      icon: "i-lucide-check",
      title: editingId.value ? "Link updated" : "Link created",
    });

    modalOpen.value = false;
    await refresh();
  } catch (error) {
    toast.add({
      color: "error",
      description: errorMessage(error),
      icon: "i-lucide-circle-alert",
      title: "Could not save link",
    });
  } finally {
    saving.value = false;
  }
};

// --- Row actions -----------------------------------------------------------

const toggleField = async (
  link: LinkRow,
  field: "enabled" | "listed",
  value: boolean,
) => {
  try {
    await $fetch(`/api/links/${link.id}`, {
      body: { [field]: value },
      method: "PATCH",
    });
    link[field] = value;
  } catch (error) {
    toast.add({
      color: "error",
      description: errorMessage(error),
      title: "Could not update link",
    });
  }
};

const removeLink = async (link: LinkRow) => {
  if (!window.confirm(`Delete /${link.slug}? Its click history goes too.`))
    return;

  try {
    await $fetch(`/api/links/${link.id}`, { method: "DELETE" });
    toast.add({ icon: "i-lucide-trash", title: `Deleted /${link.slug}` });
    await refresh();
  } catch (error) {
    toast.add({
      color: "error",
      description: errorMessage(error),
      title: "Could not delete link",
    });
  }
};

const copyLink = async (link: LinkRow) => {
  await navigator.clipboard.writeText(`https://${SHORT_DOMAIN}/${link.slug}`);
  toast.add({ icon: "i-lucide-copy", title: "Copied to clipboard" });
};
</script>

<template>
  <UContainer class="pb-16">
    <UPageHeader title="Links">
      <template #links>
        <UButton icon="i-lucide-plus" @click="openCreate"> New link </UButton>
      </template>
    </UPageHeader>

    <div class="py-6">
      <UInput
        v-model="search"
        icon="i-lucide-search"
        placeholder="Search links…"
        class="mb-4 max-w-sm"
      />

      <UTable
        :data="filteredLinks"
        :columns="columns"
        :loading="status === 'pending'"
        empty="No links yet. Create one to get started."
      >
        <template #slug-cell="{ row }">
          <NuxtLink
            :to="`/links/${row.original.id}`"
            class="text-primary font-mono hover:underline"
          >
            /{{ row.original.slug }}
          </NuxtLink>

          <p
            v-if="row.original.description"
            class="text-muted max-w-xs truncate text-xs"
          >
            {{ row.original.description }}
          </p>
        </template>

        <template #url-cell="{ row }">
          <div class="flex max-w-md items-center gap-2">
            <UIcon
              v-if="checkingAll && !linkChecks[row.original.id]"
              name="i-lucide-loader-circle"
              class="text-muted size-4 shrink-0 animate-spin"
              aria-label="Checking destination"
            />

            <UTooltip
              v-else-if="linkChecks[row.original.id]"
              :text="linkChecks[row.original.id]!.message"
            >
              <UIcon
                :name="checkIcons[linkChecks[row.original.id]!.status].icon"
                :class="checkIcons[linkChecks[row.original.id]!.status].class"
                class="size-4 shrink-0"
                :aria-label="linkChecks[row.original.id]!.message"
              />
            </UTooltip>

            <a
              :href="row.original.url"
              target="_blank"
              rel="noopener noreferrer"
              class="truncate hover:underline"
            >
              {{ row.original.url }}
            </a>
          </div>
        </template>

        <template #clickCount-cell="{ row }">
          <span class="tabular-nums">{{ row.original.clickCount }}</span>
        </template>

        <template #lastClicked-cell="{ row }">
          <span class="text-muted">
            {{
              row.original.lastClicked
                ? dayjs(row.original.lastClicked).fromNow()
                : "Never"
            }}
          </span>
        </template>

        <template #enabled-cell="{ row }">
          <USwitch
            :model-value="row.original.enabled"
            @update:model-value="toggleField(row.original, 'enabled', $event)"
          />
        </template>

        <template #listed-cell="{ row }">
          <USwitch
            :model-value="row.original.listed"
            @update:model-value="toggleField(row.original, 'listed', $event)"
          />
        </template>

        <template #actions-cell="{ row }">
          <div class="flex justify-end gap-1">
            <UButton
              icon="i-lucide-copy"
              color="neutral"
              variant="ghost"
              size="sm"
              aria-label="Copy short link"
              @click="copyLink(row.original)"
            />

            <UButton
              icon="i-lucide-chart-line"
              color="neutral"
              variant="ghost"
              size="sm"
              aria-label="View stats"
              :to="`/links/${row.original.id}`"
            />

            <UButton
              icon="i-lucide-pencil"
              color="neutral"
              variant="ghost"
              size="sm"
              aria-label="Edit"
              @click="openEdit(row.original)"
            />

            <UButton
              icon="i-lucide-trash"
              color="error"
              variant="ghost"
              size="sm"
              aria-label="Delete"
              @click="removeLink(row.original)"
            />
          </div>
        </template>
      </UTable>
    </div>

    <UModal
      v-model:open="modalOpen"
      :title="editingId ? 'Edit link' : 'New link'"
    >
      <template #body>
        <form id="link-form" class="space-y-4" @submit.prevent="save">
          <UFormField label="Slug" name="slug" :error="slugError" required>
            <UInput
              v-model="form.slug"
              placeholder="gh"
              autofocus
              :ui="{
                base: 'pl-13.5 font-mono',
                leading: 'pointer-events-none',
              }"
            >
              <template #leading>
                <p class="text-muted text-sm">{{ SHORT_DOMAIN }}/</p>
              </template>

              <template #trailing>
                <UButton
                  icon="i-lucide-dices"
                  color="neutral"
                  variant="link"
                  size="sm"
                  aria-label="Random slug"
                  @click="randomSlug"
                />
              </template>
            </UInput>
          </UFormField>

          <UFormField
            label="Destination URL"
            name="url"
            required
            :error="urlCheck?.status === 'error' ? urlCheck.message : undefined"
            :help="
              urlCheck && urlCheck.status !== 'error'
                ? urlCheck.message
                : undefined
            "
          >
            <UInput
              v-model="form.url"
              type="url"
              placeholder="https://github.com/…"
              required
              class="w-full"
              :loading="checkingUrl"
              :trailing-icon="
                urlCheck && !checkingUrl
                  ? checkIcons[urlCheck.status].icon
                  : undefined
              "
              :ui="{
                trailingIcon: urlCheck ? checkIcons[urlCheck.status].class : '',
              }"
            />
          </UFormField>

          <UFormField label="Description" name="description">
            <UTextarea v-model="form.description" :rows="2" class="w-full" />
          </UFormField>

          <UFormField name="enabled">
            <USwitch v-model="form.enabled" label="Enabled" />
          </UFormField>

          <UFormField name="listed">
            <USwitch
              v-model="form.listed"
              label="Show in sitemap"
              description="List this link in sitemap.xml and llms.txt"
            />
          </UFormField>
        </form>
      </template>

      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton color="neutral" variant="ghost" @click="modalOpen = false">
            Cancel
          </UButton>

          <UButton
            type="submit"
            form="link-form"
            :loading="saving"
            :disabled="
              !!slugError ||
              !form.slug ||
              !form.url ||
              checkingUrl ||
              urlCheck?.status === 'error'
            "
          >
            {{ editingId ? "Save" : "Create" }}
          </UButton>
        </div>
      </template>
    </UModal>
  </UContainer>
</template>
