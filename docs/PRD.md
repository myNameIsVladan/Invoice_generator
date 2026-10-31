# Invoice Generator — Product requirements

Invoice Generator is a web app for a freelancer who needs to create an invoice, send it, and get paid. One person uses the app for their own clients and their own invoices. There are no organizations, teams, or shared accounts.

The interface and the invoice PDF are in English.

## Goal

From one place, the user can:

- store the sender details that appear on every invoice
- keep a list of clients
- create an invoice from a fixed layout
- download a PDF
- give the client a Stripe payment link for the exact invoice total
- email the PDF and the payment link in one step
- see which invoices are paid, unpaid, or overdue

## User

There is one role.

The user can register, sign in, sign out, and reset a forgotten password. After registration the user can sign in immediately. Creating an invoice stays unavailable until the account email is confirmed. The app offers a way to resend the confirmation message.

The user can edit their sender profile, manage clients, create and send invoices, review previous invoices, and mark an unpaid invoice as paid by hand.

A paid invoice that was paid through Stripe stays paid, and it stays locked. A paid invoice that the user marked by hand can be set back to unpaid, which unlocks editing again.

## Outside this version

- Teams, extra user roles, and more than one sender profile
- Logo upload and other branding options
- Credit notes, discounts, deposits, partial payments, and recurring invoices
- More than one currency on a single invoice
- Payment reminder emails, and emails that confirm a payment
- Account deletion

## Screens

| Screen | What the user does there |
|---|---|
| Register | Creates an account with email and password |
| Sign in | Enters email and password |
| Forgot password | Requests a reset link |
| Reset password | Sets a new password |
| Confirm email | Opens the confirmation link. Until this is done, Create stays disabled |
| Invoices | Home screen. Lists this user's invoices |
| Create invoice | Fills in the invoice, sees a live preview, and sends it |
| Invoice | Reads one invoice, downloads the PDF, resends it, or changes its status |
| Clients | Lists clients, including archived ones |
| Add or edit client | Edits that client's details, or archives and restores the client |
| Profile | Edits the sender details used as From |

Signing in opens the invoice list. A signed-out visitor sees the sign-in screen, with a way to register and a way to reset a password.

## Profile

The profile is the From block on every new invoice. The fields are:

- Full name
- Company name
- Email
- Address
- VAT ID
- Website

Every field can be saved empty. Create stays disabled until the profile has a full name or a company name, and the form links to the profile so the user can fill one in.

From on an invoice is a copy taken when that invoice is created. Changing the profile later leaves existing invoices and their PDFs as they were. From is read-only on the invoice form.

The name shown to the client is the company name when it exists, and the full name otherwise.

## Clients

The user can add, view, edit, archive, and restore clients. The fields are:

- Full name
- Company name
- Email
- Address
- VAT ID

Every field can be saved empty on the Clients screen. A client with no email can be stored, and that client stays out of the invoice picker until an email is added.

Archiving hides the client from the picker and keeps them on invoices that already use them. Restore puts the client back in the picker. The user does not hard-delete a client.

A client added from the invoice form is saved to the client list. That form requires an email. The other client fields stay optional.

The To block on an invoice is a copy taken when that invoice is created. Later edits to the client record do not change invoices already created. Choosing a different client on an unpaid invoice copies that client's current details onto the invoice.

## Invoice list

The list is the home screen. It is ordered with the newest invoice first, 20 invoices per page.

Each row shows:

- invoice number
- client
- invoice date
- due date
- total
- status

An unpaid invoice whose due date is before today also shows an Overdue badge. Overdue is a label, not a third status. A paid invoice does not show Overdue.

The user can search by invoice number or client name, and can filter by All, Not paid, Paid, or Overdue.

Row actions:

- view
- edit, for an unpaid invoice
- delete, for an unpaid invoice
- resend
- download PDF

A Stripe-paid invoice has no edit or delete action. A manually paid invoice has no edit or delete action while it remains paid. Setting it back to unpaid brings those actions back.

## Create invoice

The create screen is a form and a live preview of the invoice. The preview uses the same layout as the PDF.

The user picks a client from a dropdown of active clients that have an email, or adds a client without leaving the form.

Header fields:

- From, filled from the profile and read-only
- To, the selected client
- Invoice number, assigned when the invoice is created
- Invoice date, defaulting to today
- Due date, defaulting to 14 days after the invoice date
- Currency: EUR, USD, or GBP, defaulting to EUR

The invoice date and the due date can be in the past or the future. The due date is on or after the invoice date.

Line items: the user adds one or more rows. Each row has:

- Description
- Quantity
- Unit: Hours, Days, Pieces, or Flat
- Price
- VAT rate

Quantity and price are multiplied for every unit, including Flat. The unit is a label. Quantity is greater than zero and can have two decimal places. Price is zero or greater, with two decimal places. The VAT rate is a percentage the user types, from 0 through 100, with two decimal places.

Prices are VAT-exclusive. For each line:

- line amount = quantity × price, rounded to two decimals
- line tax = line amount × VAT rate, rounded to two decimals
- line total = line amount + line tax

The invoice shows one subtotal, one tax total, and one grand total. The VAT rate remains visible on each line. The grand total is greater than zero.

The footer has an optional comments field, printed on the invoice.

The user can add an optional personal note. The note is included in the email and is not printed on the invoice.

Create is available only when all of these are true:

- the account email is confirmed
- the profile has a full name or a company name
- the client has an email
- there is at least one line
- the total is greater than zero

Submitting creates the invoice and emails the client immediately. There is no saved draft and no separate send step.

If the user has not finished Stripe onboarding, the form is kept and the user is taken through Stripe's hosted onboarding. When they return, the app creates and sends the invoice. If they leave onboarding before it is finished, nothing is sent and no invoice number is used. Sender and client details are copied at the moment the invoice is actually created, so a profile or client edit made before that moment is included.

After a successful send, the form clears and shows a success message with a link to the invoice.

If the email fails, the invoice still exists as unpaid, the payment link still works, and the screen shows Send failed. The user can retry from that screen or from the invoice.

## Invoice number

The number is assigned by the app. The user cannot type it or change it later.

The format is `INV-2026-001`. The year comes from the invoice date at creation. Each user has their own sequence, and the sequence starts again at 001 each calendar year. Editing the date later does not change the number.

## Invoice detail

The detail screen shows the same invoice the client received, plus the current payment link and the send state.

The user can:

- download the PDF
- resend the email
- mark an unpaid invoice as paid
- set a manually paid invoice back to unpaid
- edit an unpaid invoice
- delete an unpaid invoice

The downloaded PDF is always the current invoice. An edit updates the stored PDF even when the user does not resend the email.

## Editing and resending

Editing is available for unpaid invoices.

Changing the total, the currency, or the client deactivates the current payment link and creates a new link for the new total and currency.

Changing the invoice date, the due date, or the comments keeps the current payment link.

Both kinds of edit ask, in a dialog, whether to resend the invoice. The dialog includes the same optional personal note. The invoice is saved either way.

If the user declines the resend after a date or comment change, the client's existing link still pays the same total. The PDF they already have is the previous one. The PDF in the app is the updated one.

If the user declines the resend after a total, currency, or client change, the link in the old email no longer accepts payment. The new link is on the invoice, and Resend sends it.

Resend from the list or the invoice uses the current PDF and the current link, and again offers the optional note.

## Payment

Each invoice has one active Stripe payment link for its exact total, in its currency. The client pays the freelancer's own Stripe account. The app does not take a fee. Stripe's processing fee is paid by the freelancer's Stripe account.

The link is created when the invoice is created. Replacing a link deactivates the previous one. An invoice has only one active link at a time.

A successful Stripe payment marks the invoice paid. The user cannot set that invoice back to unpaid, edit it, or delete it.

The user can mark an unpaid invoice paid by hand, for example after a bank transfer. That action deactivates the payment link so the client cannot pay it as well. Setting that invoice back to unpaid creates a new payment link and does not email the client. The user can resend when they want the client to have the new link.

Deleting an unpaid invoice deactivates its payment link and removes the invoice.

## Email

The email comes from the app. A reply goes to the profile email. When the profile email is empty, a reply goes to the account email.

The subject is fixed:

`Invoice INV-2026-001 from Northwind Studio`

The sender name in the subject is the company name, or the full name when there is no company name.

The body is fixed, with the personal note included only when the user wrote one:

```
Hello,

Please find invoice INV-2026-001 attached.

<personal note>

You can pay it here:
<payment link>

Thank you,
Northwind Studio
```

The PDF is attached. The file name is the invoice number, for example `INV-2026-001.pdf`.

A failed send can be retried. Retry uses the current PDF and the active payment link, and offers the optional note again.

## PDF

The PDF is A4 and uses the same layout as the on-screen preview.

The layout, from top to bottom:

1. Invoice title and sender name
2. From and To
3. Invoice number, invoice date, due date, and currency
4. Line items: description, quantity, unit, price, VAT rate, and amount
5. Subtotal, tax, and total
6. Comments, when the user entered any

Amounts are written as `1,234.56 EUR`, with a thousands comma, a decimal point, and the currency code. Empty profile or client fields are omitted. The payment link and the personal note are not printed on the PDF.

## Status rules

| Situation | Status | Can edit or delete | Payment link |
|---|---|---|---|
| Created, client has not paid | Not paid | Yes | Active |
| Email failed after create | Not paid, send failed | Yes | Active |
| Due date has passed and the client has not paid | Not paid, Overdue badge | Yes | Active |
| Client paid through Stripe | Paid | No | Deactivated |
| User marked it paid | Paid | No, until it is set back to unpaid | Deactivated |
| User set a hand-marked invoice back to unpaid | Not paid | Yes | New active link, client is not emailed |

## Validation the user can see

- Create explains which requirement is missing: confirmed email, sender name or company, client email, a line, or a total above zero.
- A due date before the invoice date is rejected.
- Quantity must be greater than zero. Price and VAT must be valid numbers in range.
- Currency is one of EUR, USD, and GBP.
- Paid invoices do not offer edit or delete. A Stripe-paid invoice does not offer a return to unpaid.
- Archive, restore, resend, retry, and the manual status change ask for confirmation where a mistake would email the client or deactivate a link.

## Quality

The app works on a phone and on a desktop. Forms use visible labels and explain errors next to the field. The PDF is readable in black and white. Each user sees only their own profile, clients, invoices, and PDFs.
