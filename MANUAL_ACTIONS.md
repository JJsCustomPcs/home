# Manual Actions

These actions require account access, business decisions, external tools, or legal review. They were not performed in this repository.

## Production and duplicate deployment

- **Unpublish the GitHub Pages deployment for `jjscustompcs/Test`.** Keep the repository if it is still useful, but remove its public Pages deployment so it cannot compete with the production domain in search. Do not noindex or block `jjscustompcs.com`.
- Verify `jjscustompcs.com` as the preferred property in Google Search Console, submit `https://jjscustompcs.com/sitemap.xml`, and inspect representative homepage, service, and build URLs for indexing and selected canonicals.
- Review GitHub Pages custom-domain verification, DNS records, and HTTPS enforcement without changing the production apex-domain convention.

## Local business presence

- Set up or complete the service-area Google Business Profile. Keep the residential address hidden and use only truthful service areas.
- Add a business phone number only if JJ wants calls and can publish a dedicated number.
- Confirm public hours or appointment hours before adding them to the site or business listings.
- Request reviews from real customers through approved channels; never create or prewrite reviews on a customer's behalf.
- Create or correct consistent local citations and pursue relevant local outreach only with accurate business information.

## Analytics and external validation

- If analytics is wanted, add the real GA4 or Tag Manager configuration. The site's event wrapper currently sends nothing because no analytics tag or measurement ID is configured. After configuration, verify `view_service`, `view_packages`, `view_build`, `start_quote`, `quote_step`, `copy_quote_summary`, `form_error`, `click_email`, `click_phone`, and confirmed-success `generate_lead` events without sending form-entered personal data.
- Run Google's Rich Results Test on the production homepage and representative service pages after deployment.
- Run PageSpeed Insights on representative production mobile and desktop URLs after deployment. No external PageSpeed score is claimed in this implementation.

## Policy, security, and legal review

- Have an Ohio attorney review the existing Terms, warranty disclaimer, liability language, and any future customer-parts or workmanship policy. This implementation changed only first-person/business-name consistency, not the substance of the legal terms.
- Verify multi-factor authentication on GitHub and the domain registrar, then review repository collaborators and domain-account recovery information.

