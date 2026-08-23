REAL DYNAMIC VERSION

This version is not based on hard-coded customer/booking data.

Dynamic:
- Supabase Auth signup/login/logout
- Current user profile
- Sports fields loaded from sports_fields
- Booking creation stored in bookings
- Availability checked by the database trigger
- Payment record stored in payments
- My bookings loaded from the database
- User name/email comes from the authenticated account

Setup:
1. Create a Supabase project.
2. Open SQL Editor and run database.sql.
3. Put Project URL + anon/publishable key in config.js.
4. In Authentication -> Providers -> Email, enable Email.
5. For the fastest demo, disable Confirm email. If enabled, users must verify email first.
6. Upload all files to GitHub Pages.

Note: the payment screen records the selected payment method/status; it is NOT a real bank/card payment gateway.
