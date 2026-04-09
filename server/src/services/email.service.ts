import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? 'localhost',
  port: parseInt(process.env.SMTP_PORT ?? '1025'),
  auth:
    process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
})

async function trySendMail(options: Parameters<typeof transporter.sendMail>[0]) {
  try {
    await transporter.sendMail(options)
  } catch (err) {
    // In development, SMTP may not be running — log the email to console instead
    console.warn('[email] SMTP unavailable, logging email to console:')
    console.warn(`  To: ${options.to}`)
    console.warn(`  Subject: ${options.subject}`)
    console.warn(`  Body: ${options.html}`)
  }
}

export async function sendInviteEmail(to: string, token: string, inviterName: string) {
  if (process.env.NODE_ENV === 'test') return
  const url = `${process.env.APP_URL}/invite/${token}`
  await trySendMail({
    from: process.env.EMAIL_FROM ?? 'noreply@booking.app',
    to,
    subject: `${inviterName} 邀请您加入会议室预订系统`,
    html: `<p>点击链接完成注册：<a href="${url}">${url}</a></p><p>链接 24 小时内有效。</p>`,
  })
}

export async function sendPasswordResetEmail(to: string, token: string) {
  if (process.env.NODE_ENV === 'test') return
  const url = `${process.env.APP_URL}/reset-password?token=${token}`
  await trySendMail({
    from: process.env.EMAIL_FROM ?? 'noreply@booking.app',
    to,
    subject: '重置您的密码',
    html: `<p>点击链接重置密码：<a href="${url}">${url}</a></p><p>链接 1 小时内有效。</p>`,
  })
}
