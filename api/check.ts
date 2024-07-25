import { z } from 'zod';
import nodemailer from 'nodemailer';

const Account = z.object({
  host: z.string({
    required_error: 'host is required',
    invalid_type_error: 'host must be a boolean',
  }),
  port: z
    .number({
      required_error: 'port is required',
      invalid_type_error: 'port must be a boolean',
    })
    .positive(),
  secure: z.boolean({
    required_error: 'tls is required',
    invalid_type_error: 'tls must be a boolean',
  }),
  username: z.string({
    required_error: 'username is required',
    invalid_type_error: 'username must be a boolean',
  }),
  password: z.string({
    required_error: 'password is required',
    invalid_type_error: 'password must be a boolean',
  }),
});

type EmailAccount = z.infer<typeof Account>;

export const post = async ({ data }: { data: EmailAccount }) => {
  const result = Account.safeParse(data);
  console.log(data);
  if (!result.success) {
    return { success: false, msg: result.error.message };
  }
  const conn = nodemailer.createTransport({
    host: result.data.host,
    port: result.data.port,
    secure: result.data.secure,
    auth: {
      user: result.data.username,
      pass: result.data.password,
    },
    tls: {
      // do not fail on invalid certs
      rejectUnauthorized: false,
    },
  });
  const { promise, resolve } = Promise.withResolvers<{
    success: boolean;
    msg: string;
  }>();
  conn.verify((err: Error | null, success: boolean) => {
    console.log(err);
    resolve({
      success: success ?? false,
      msg: err ? `${err?.name} ${err?.message}` : '',
    });
  });
  const result2 = await promise;
  console.log(result2);
  return result2;
};
