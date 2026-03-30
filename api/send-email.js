module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' })
    }
  
    const { email } = req.body
  
    if (!email) {
      return res.status(400).json({ error: 'Email is required' })
    }
  
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'onboarding@resend.dev',
        to: [email],
        subject: "You're on the waitlist 🎉",
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
            <h2 style="margin:0 0 16px">You're in.</h2>
            <p>Thanks for joining. We're building the free alternative to CoStar — covering NY, NJ, FL and expanding to all 50 states.</p>
            <p>We'll email you the moment early access opens.</p>
            <p style="color:#999;font-size:13px;margin-top:32px">— The Team</p>
          </div>
        `,
      }),
    })
  
    if (!response.ok) {
      return res.status(500).json({ error: 'Failed to send email' })
    }
  
    return res.status(200).json({ ok: true })
  }