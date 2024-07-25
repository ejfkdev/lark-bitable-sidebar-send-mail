import { z } from 'zod';
import nodemailer from 'nodemailer';

const ZodAccount = z.object({
  host: z.string({
    required_error: 'host is required',
    invalid_type_error: 'host must be a string',
  }),
  port: z
    .number({
      required_error: 'port is required',
      invalid_type_error: 'port must be a number',
    })
    .positive(),
  secure: z.boolean({
    required_error: 'tls is required',
    invalid_type_error: 'tls must be a boolean',
  }),
  username: z.string({
    required_error: 'username is required',
    invalid_type_error: 'username must be a string',
  }),
  password: z.string({
    required_error: 'password is required',
    invalid_type_error: 'password must be a string',
  }),
});

const ZodEmailContent = z.object({
  to: z
    .string({
      required_error: 'to is required',
      invalid_type_error: 'to must be a string',
    })
    .email(),
  subject: z.string({
    required_error: 'subject is required',
    invalid_type_error: 'subject must be a string',
  }),
  content: z.string({
    required_error: 'content is required',
    invalid_type_error: 'content must be a string',
  }),
});

const ZodEmailConfig = ZodAccount.merge(ZodEmailContent);

type EmailAccount = z.infer<typeof ZodAccount>;
type EmailContent = z.infer<typeof ZodEmailContent>;
type EmailConfig = EmailAccount & EmailContent;

export const post = async ({ data }: { data: EmailConfig }) => {
  const result = ZodEmailConfig.safeParse(data);
  console.log(data);
  if (!result.success) {
    return { success: false, msg: result.error.message };
  }
  const conn = nodemailer.createTransport({
    pool: true,
    host: result.data.host,
    port: result.data.port,
    secure: result.data.secure,
    auth: {
      user: result.data.username,
      pass: result.data.password,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  try {
    const result2 = await conn.sendMail({
      from: result.data.username,
      to: result.data.to,
      subject: result.data.subject,
      html: result.data.content,
    });

    return { success: true, msg: result2.response };
  } catch (err: any) {
    return { success: false, msg: err ? `${err?.name} ${err?.message}` : '' };
  }
};
