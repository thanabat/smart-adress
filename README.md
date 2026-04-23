# Smart Adress

A small TypeScript prototype for smart Thai address search and form prefill.

## What it does

- Search by Thai postcode, province, district, or subdistrict.
- Search by English province, district, or subdistrict.
- Search by saved house number examples such as `55/12`.
- Select a suggestion to prefill the address form.

House number search only works from saved address data because public Thai geography datasets do not include individual home numbers.

## Run

```bash
npm install
npm run dev
```

Then open the local URL shown by Vite, usually:

```text
http://127.0.0.1:5173/
```

## Data

The local address dataset is `src/data/geography.json`, downloaded from the MIT-licensed [`thailand-geography-json`](https://github.com/thailand-geography-data/thailand-geography-json) project.

The saved house number examples are currently hardcoded in `src/main.ts` as mock user/customer address history. Replace that list later with your real saved address source.
