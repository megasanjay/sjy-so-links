import { z } from "zod";
import { hash } from "argon2";
import prisma from "#server/utils/prisma";
import { defineEventHandler, readValidatedBody, createError } from "h3";
import { rateLimit } from "#server/utils/rateLimit";
import { useRuntimeConfig } from "nitropack/runtime";

const signupSchema = z.object({
  emailAddress: z.string().email().max(254),
  familyName: z.string().max(100),
  givenName: z.string().max(100),
  password: z.string().min(12).max(128),
});

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();

  // Off by default: anyone who can sign up can create redirects on the domain
  if (!config.public.enableSignup) {
    throw createError({
      statusCode: 403,
      statusMessage: "Sign up is currently disabled",
    });
  }

  rateLimit(event, { name: "signup", limit: 10, windowMs: 60 * 60 * 1000 });

  const body = await readValidatedBody(event, (b) => signupSchema.safeParse(b));

  if (!body.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing or invalid signup details",
    });
  }

  const normalizedEmail = body.data.emailAddress.trim().toLowerCase(); // Normalize email

  // Check if the user already exists
  const user = await prisma.user.findUnique({
    where: {
      emailAddress: normalizedEmail, // Use normalized email
    },
  });

  if (user) {
    throw createError({
      statusCode: 409,
      statusMessage: "Email address already in use",
    });
  }

  const hashedPassword = await hash(body.data.password);

  await prisma.user.create({
    data: {
      emailAddress: normalizedEmail,
      familyName: body.data.familyName,
      givenName: body.data.givenName,
      password: hashedPassword,
    },
  });

  return { message: "Account created" };
});
