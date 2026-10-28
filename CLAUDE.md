# NocoDB — навчальна CRM база `bab_crm_v0625`

Навчальна (учбова) база: масові зміни даних дозволені, якщо користувач про них просить.

- MCP сервер: `nocodb-bab-crm` (див. `.mcp.json`), endpoint `https://app.nocodb.com/mcp/nc2qypis9lg5jw50`
- Base ID: `pbje4jyruzt4csb`, workspace `w1ql3ty1`
- Автори в даних замасковані: `den****kiy@gmail.com`, `il***yi@gmail.com`

## Таблиці та поля

Типи зв'язків: `mo` = many-to-one (одне значення), `om` = one-to-many (зворотний бік), `mm` = many-to-many.

### Quotes (`m3dyeoquca1l9b3`) — «Замовлення»
- Quote_ID, Notes, Author: SingleLineText
- Amount: Decimal
- Date/Time: Date
- Payment_Status: SingleLineText (`c2nhtw47ymucszt`), за замовчуванням «Waiting for payment»; значення «Waiting for payment» / «Paid», згодом «Canceled». В інтерфейсі: «Очікує оплати» / «Оплачено» / «Скасовано»
- Opportunity → Opportunities [mo] (`cxtmefpoonkw4kl`)
- Company → Companies [mo] (`cm2uejehlgx6d0p`)
- Contact → Contacts [mo] (`c858wri1e28m9ms`)
- **Products → Products [mm] (`cd6s62ka0jmbaj4`)** — квота може мати кілька товарів

### Products (`mr6oh68zooj8s3t`)
- Product_ID, Customer ID, Name, Description, Category, Image, Price: SingleLineText
- **Quotes → Quotes [mm] (`cjmg5wa080l7m3t`)** — зворотний бік many-to-many

### Opportunities (`mx1mt4x1hoi2fkm`)
- Opportunity_ID, Company, Contact, Description, Product, Stage, Owner: SingleLineText (Company/Contact/Product тут просто текст)
- Amount: Decimal
- Quotes → Quotes [om] (`c6u95cnt9omvw6o`)

### Companies (`mverd6x9bht6j4s`)
- Company_ID, Name, URL, Logo, Address: SingleLineText
- Quotes → Quotes [om] (`c3n5h701e13vy5e`)
- Activities → Activity [om] (`cqiky8rt5xo0ii7`)
- Contacts → Contacts [om] (`chaecwospccwp5d`)

### Contacts (`m8p3qzcy661rnh9`)
- Contact_ID, First Name, Last Name, Title, Email, Phone, Status: SingleLineText
- Company → Companies [mo] (`cltawntfjjens4v`) — компанія, де працює контакт
- Quotes → Quotes [om] (`cn9r3f58bbddvym`)
- Activities → Activity [om] (`cib2u2d584o5mb3`)

### Activity (`mm57w7v7zqqft4c`)
- Activity_ID, Type, Date/Time, Author: SingleLineText
- Contact → Contacts [mo] (`cmkiciud6om50xj`)
- Company → Companies [mo] (`c60gu2xjkkk1me1`)

## Резервні копії
- `backups/` — повні копії записів, видалених через API (JSON), з датою в назві файлу. Перед масовим видаленням зберігати сюди копію, бо тимчасова папка сесії не зберігається.

## Особливості API
- MCP-токен має право `deleteRecords` (до 100 записів за виклик). Видалене потрапляє в кошик NocoDB (`listTrash` / `restoreFromTrash`, категорія `trash` у `listTools`).
- `queryRecords`: гортати сторінки за полем `next` у відповіді, а не за розміром сторінки (сервер віддає менше, ніж `pageSize`). Offset ≥ 500 без фільтра дає помилку, тому для великих таблиць краще фільтрувати.
- `updateRecords` не дозволяє в одному запиті прив'язати кілька записів до того самого зв'язаного запису («Cannot link to same id on same request»). Масове прив'язування до одного запису робити через `linkRecords` з протилежного боку (зворотне поле `om`/`mm`), до 100 посилань за раз.
