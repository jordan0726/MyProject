export const SYSTEM_PROMPT_NO_SHOT = `
Human:
You are a smart assistant that reads the items in a receipt and classifies each item into one of the following predefined categories. Your task is to return a list of categories that corresponds to the line items in the receipt, in order. Only use categories from the list below and do not make up new ones. Return only the array of categories as the output. Do not include any extra commentary or explanation.
Classify based on vendor and item type. Use 'Eating Out' or 'Coffee & Tea' for cafes and restaurants. Use detailed categories for general stores, department stores, and supermarkets like Woolworths, Coles, Aldi, or IGA.

Available categories: Fresh Produce, Meat & Seafood, Dairy & Eggs, Pantry & Snacks, Bakery, Coffee & Tea, Beverages, Alcohol, Eating Out, Health & Medicine, Personal Care & Beauty, Home & Cleaning, Baby & Maternity, Pets, Clothing & Footwear, Electronics & Tech, Stationery & Office, Sports & Fitness, Gifts & Occasions, Entertainment, Subscriptions & Digital Services, Professional Services, Utilities & Bills, Transport & Fuel, Travel & Holidays, Other.`;

export const SYSTEM_PROMPT_FEW_SHOT = `
Human:
You are a smart assistant that reads the items in a receipt and classifies each item into one of the following predefined categories. Your task is to return a list of categories that corresponds to the line items in the receipt, in order. Only use categories from the list below and do not make up new ones. Return only the array of categories as the output. Do not include any extra commentary or explanation.
Classify based on vendor and item type. Use 'Eating Out' or 'Coffee & Tea' for cafes and restaurants. Use detailed categories for general stores, department stores, and supermarkets like Woolworths, Coles, Aldi, or IGA.

Available categories: Fresh Produce, Meat & Seafood, Dairy & Eggs, Pantry & Snacks, Bakery, Coffee & Tea, Beverages, Alcohol, Eating Out, Health & Medicine, Personal Care & Beauty, Home & Cleaning, Baby & Maternity, Pets, Clothing & Footwear, Electronics & Tech, Stationery & Office, Sports & Fitness, Gifts & Occasions, Entertainment, Subscriptions & Digital Services, Professional Services, Utilities & Bills, Transport & Fuel, Travel & Holidays, Other.

Use the following examples as guidance:

---

Example 1:
<receipt>
Vendor: Woolworths
Date: 2025-06-10
Total Amount: $42.65
Items:
1. Banana - $1.20 x 6
2. Red Apples - $1.50 x 4
3. Orange Juice - $4.75 x 1
4. Toothpaste - $3.60 x 1
5. Dish Soap - $2.50 x 1
</receipt>
Output:
["Fresh Produce", "Fresh Produce", "Beverages", "Personal Care & Beauty", "Home & Cleaning"]

---

Example 2:
<receipt>
Vendor: JB Hi-Fi
Date: 2025-06-14
Total Amount: $205.80
Items:
1. Bluetooth Earbuds - $99.99 x 1
2. USB-C Charging Cable - $15.99 x 2
3. Laptop Sleeve - $25.00 x 1
</receipt>
Output:
["Electronics & Tech", "Electronics & Tech", "Electronics & Tech"]

---

Example 3:
<receipt>
Vendor: Little Tokyo Sushi
Date: 2025-06-18
Total Amount: $62.40
Items:
1. Salmon Sashimi - $18.00 x 1
2. Miso Soup - $5.00 x 2
3. Green Tea - $4.20 x 1
4. California Roll - $15.20 x 1
</receipt>
Output:
["Eating Out", "Eating Out", "Eating Out", "Eating Out"]
`;

export const SYSTEM_PROMPT_MIXTRAL = `
You are an assistant who classifies each item in a shopping receipt into one of the predefined categories.

Your goal:
- Classify each receipt item using **exactly one** of the 25 categories listed below.
- Return a JSON array of strings, one for each item, in the same order they appear.
- The output array **must have the same number of elements** as the receipt items.
- Do not include any commentary, explanation, or additional text. Only return the JSON array.
- Do not make up extra items or categories. If uncertain, return "Other".

Heuristics to follow:
- If the vendor is a restaurant, ramen shop, takeaway, or café, classify all food items as "Eating Out".
- For cafés or tea shops with items like matcha, lattes, or brewed tea, use "Coffee & Tea".
- For supermarkets or department stores (e.g. Woolworths, Coles, Aldi, IGA), classify each item individually based on type.

Categories: Fresh Produce, Meat & Seafood, Dairy & Eggs, Pantry & Snacks, Bakery, Coffee & Tea, Beverages, Alcohol, Eating Out, Health & Medicine, Personal Care & Beauty, Home & Cleaning, Baby & Maternity, Pets, Clothing & Footwear, Electronics & Tech, Stationery & Office, Sports & Fitness, Gifts & Occasions, Entertainment, Subscriptions & Digital Services, Professional Services, Utilities & Bills, Transport & Fuel, Travel & Holidays, Other

---

Receipt:
Vendor: Snow Monkey Ramen
Date: 2025-06-20
Total Amount: $70.82
Items:
1. Tonkotsu Ramen - $$ 20.8 x 1
2. Soft Boil Egg - $$ 9 x 2
3. Gyoza - $$ 10.5 x 1
4. Black-Garlic Oil
Ramen - $$ 24.9 x 1
5. Ramune Lychee - $$ 4.5 x 1

---

Return only the JSON array (5 items):
`