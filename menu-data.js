const chopstickMenuData = [
  {
    id: "california-rolls",
    name: "California rolls",
    image: "assets/sushi-rolls.jpg",
    products: [
      { id: "california-veg", name: "Vegetarian", description: "Fresh catch, creamy avocado and sesame.", vegetarian: true, variants: [{ label: "4 pieces", price: 40 }, { label: "8 pieces", price: 75 }] },
      { id: "california-crabstick", name: "Crabstick", variants: [{ label: "4 pieces", price: 40 }, { label: "8 pieces", price: 75 }] },
      { id: "california-prawn", name: "Prawn", variants: [{ label: "4 pieces", price: 50 }, { label: "8 pieces", price: 95 }] },
      { id: "california-spicy-tuna", name: "Spicy tuna", spicy: true, variants: [{ label: "4 pieces", price: 50 }, { label: "8 pieces", price: 95 }] },
      { id: "california-salmon", name: "Salmon", variants: [{ label: "4 pieces", price: 50 }, { label: "8 pieces", price: 95 }] },
      { id: "california-smoked-salmon", name: "Smoked salmon & cream cheese", variants: [{ label: "4 pieces", price: 55 }, { label: "8 pieces", price: 105 }] },
      { id: "california-tempura-prawn", name: "Tempura prawn & cream cheese", variants: [{ label: "4 pieces", price: 55 }, { label: "8 pieces", price: 105 }] }
    ]
  },
  {
    id: "fashion-sandwiches",
    name: "Fashion sandwiches",
    image: "assets/small-plates.jpg",
    description: "Fresh catch and avocado between seaweed and sushi rice, with Quepee mayo and sesame.",
    products: [
      { id: "fashion-veg", name: "Vegetarian", vegetarian: true, variants: [{ label: "4 pieces", price: 50 }, { label: "8 pieces", price: 95 }] },
      { id: "fashion-crabstick", name: "Crabstick", variants: [{ label: "4 pieces", price: 50 }, { label: "8 pieces", price: 95 }] },
      { id: "fashion-prawn", name: "Prawn", variants: [{ label: "4 pieces", price: 55 }, { label: "8 pieces", price: 105 }] },
      { id: "fashion-salmon", name: "Salmon", variants: [{ label: "4 pieces", price: 55 }, { label: "8 pieces", price: 105 }] },
      { id: "fashion-spicy-tuna", name: "Spicy tuna", spicy: true, variants: [{ label: "4 pieces", price: 55 }, { label: "8 pieces", price: 105 }] }
    ]
  },
  {
    id: "rainbow-rolls",
    name: "Rainbow rolls",
    image: "assets/sharing-table.jpg",
    description: "A colourful roll with fish and avocado wrapped inside and finished with fish and avocado.",
    products: [
      { id: "rainbow-vegetarian-dragon", name: "Vegetarian dragon", vegetarian: true, variants: [{ label: "4 pieces", price: 55 }, { label: "8 pieces", price: 105 }] },
      { id: "rainbow-tempura-dragon", name: "Tempura dragon", variants: [{ label: "4 pieces", price: 60 }, { label: "8 pieces", price: 115 }] },
      { id: "rainbow-salmon-avo", name: "Salmon & avo", variants: [{ label: "4 pieces", price: 60 }, { label: "8 pieces", price: 115 }] },
      { id: "rainbow-salmon-deluxe", name: "Salmon deluxe", variants: [{ label: "4 pieces", price: 65 }, { label: "8 pieces", price: 125 }] },
      { id: "rainbow-best-of-both", name: "Best of both", variants: [{ label: "4 pieces", price: 70 }, { label: "8 pieces", price: 135 }] },
      { id: "rainbow-salmon-cheese-strawberry", name: "Salmon, cheese & strawberries", variants: [{ label: "4 pieces", price: 65 }, { label: "8 pieces", price: 125 }] }
    ]
  },
  {
    id: "makimono",
    name: "Makimono",
    image: "assets/sushi-rolls.jpg",
    description: "Classic sushi rolls with nori on the outside.",
    products: [
      { id: "maki-cucumber-avocado", name: "Cucumber / avocado", vegetarian: true, variants: [{ label: "4 pieces", price: 35 }, { label: "8 pieces", price: 65 }] },
      { id: "maki-crabstick", name: "Crabstick", variants: [{ label: "4 pieces", price: 35 }, { label: "8 pieces", price: 65 }] },
      { id: "maki-salmon", name: "Salmon", variants: [{ label: "4 pieces", price: 40 }, { label: "8 pieces", price: 75 }] },
      { id: "maki-prawn", name: "Prawn", variants: [{ label: "4 pieces", price: 40 }, { label: "8 pieces", price: 75 }] },
      { id: "maki-spicy-tuna", name: "Spicy tuna", spicy: true, variants: [{ label: "4 pieces", price: 40 }, { label: "8 pieces", price: 75 }] },
      { id: "maki-giant", name: "Giant maki (multiple fillings)", variants: [{ label: "4 pieces", price: 60 }, { label: "8 pieces", price: 115 }] }
    ]
  },
  {
    id: "roses",
    name: "Roses",
    image: "assets/small-plates.jpg",
    description: "Fresh catch wrapped around sushi rice and avocado, topped with Quepee mayo and caviar.",
    products: [
      { id: "rose-salmon", name: "Salmon", variants: [{ label: "3 pieces", price: 80 }, { label: "6 pieces", price: 150 }] },
      { id: "rose-tuna", name: "Tuna", variants: [{ label: "3 pieces", price: 80 }, { label: "6 pieces", price: 150 }] },
      { id: "rose-seared-salmon", name: "Seared salmon", variants: [{ label: "3 pieces", price: 85 }, { label: "6 pieces", price: 155 }] },
      { id: "rose-seared-tuna", name: "Seared tuna", variants: [{ label: "3 pieces", price: 85 }, { label: "6 pieces", price: 155 }] }
    ]
  },
  {
    id: "sashimi",
    name: "Sashimi",
    image: "assets/story-sushi.jpg",
    description: "Thinly sliced fresh or seared catch.",
    products: [
      { id: "sashimi-salmon", name: "Salmon", variants: [{ label: "3 pieces", price: 60 }, { label: "6 pieces", price: 115 }] },
      { id: "sashimi-tuna", name: "Tuna", variants: [{ label: "3 pieces", price: 60 }, { label: "6 pieces", price: 115 }] },
      { id: "sashimi-seared-salmon", name: "Seared salmon", variants: [{ label: "3 pieces", price: 65 }, { label: "6 pieces", price: 120 }] },
      { id: "sashimi-seared-tuna", name: "Seared tuna", variants: [{ label: "3 pieces", price: 65 }, { label: "6 pieces", price: 120 }] }
    ]
  },
  {
    id: "salads",
    name: "Salads",
    image: "assets/sharing-table.jpg",
    products: [
      { id: "salad-crabstick", name: "Crabstick salad", variants: [{ label: "1 portion", price: 60 }] },
      { id: "salad-prawn-avocado", name: "Prawn & avocado salad", variants: [{ label: "1 portion", price: 95 }] },
      { id: "salad-salmon-avocado", name: "Salmon & avocado salad", variants: [{ label: "1 portion", price: 95 }] },
      { id: "salad-salmon-chop-chop", name: "Salmon chop chop salad", variants: [{ label: "1 portion", price: 115 }] }
    ]
  },
  {
    id: "bean-curd",
    name: "Bean curd nigiri",
    image: "assets/small-plates.jpg",
    description: "Two pieces per portion.",
    products: [
      { id: "bean-curd-plain", name: "Plain", vegetarian: true, variants: [{ label: "2 pieces", price: 45 }] },
      { id: "bean-curd-vegetables", name: "Vegetables", vegetarian: true, variants: [{ label: "2 pieces", price: 50 }] },
      { id: "bean-curd-prawn", name: "Prawn", variants: [{ label: "2 pieces", price: 55 }] },
      { id: "bean-curd-salmon", name: "Salmon", variants: [{ label: "2 pieces", price: 55 }] },
      { id: "bean-curd-tuna", name: "Tuna", variants: [{ label: "2 pieces", price: 55 }] },
      { id: "bean-curd-crabstick-caviar", name: "Crabstick & caviar", variants: [{ label: "2 pieces", price: 55 }] }
    ]
  },
  {
    id: "nigiri",
    name: "Nigiri",
    image: "assets/sushi-rolls.jpg",
    description: "Two pieces per portion.",
    products: [
      { id: "nigiri-prawn", name: "Prawn", variants: [{ label: "2 pieces", price: 45 }] },
      { id: "nigiri-tuna", name: "Tuna", variants: [{ label: "2 pieces", price: 45 }] },
      { id: "nigiri-salmon", name: "Salmon", variants: [{ label: "2 pieces", price: 45 }] },
      { id: "nigiri-eel", name: "Eel", variants: [{ label: "2 pieces", price: 55 }] }
    ]
  },
  {
    id: "handrolls",
    name: "Handrolls",
    image: "assets/sushi-rolls.jpg",
    description: "One handroll per portion.",
    products: [
      { id: "handroll-vegetarian", name: "Vegetarian", vegetarian: true, variants: [{ label: "1 piece", price: 50 }] },
      { id: "handroll-crabstick", name: "Crabstick", variants: [{ label: "1 piece", price: 50 }] },
      { id: "handroll-prawn", name: "Prawn", variants: [{ label: "1 piece", price: 60 }] },
      { id: "handroll-tuna", name: "Tuna", variants: [{ label: "1 piece", price: 60 }] },
      { id: "handroll-salmon", name: "Salmon", variants: [{ label: "1 piece", price: 60 }] },
      { id: "handroll-smoked-salmon", name: "Smoked salmon", variants: [{ label: "1 piece", price: 60 }] },
      { id: "handroll-eel", name: "Eel", variants: [{ label: "1 piece", price: 65 }] }
    ]
  },
  {
    id: "chefs-signatures",
    name: "Chef's signature sushi",
    image: "assets/pop-up-dining.jpg",
    products: [
      { id: "signature-salmon-pyramid", name: "Salmon pyramid", description: "Sweet chilli, cream cheese and salmon, shaped like a pyramid.", variants: [{ label: "4 pieces", price: 70 }, { label: "8 pieces", price: 135 }] },
      { id: "signature-bamboo-rolls", name: "Bamboo rolls", description: "Sweet chilli, cream cheese, avocado and salmon or tempura prawns, wrapped with cucumber.", variants: [{ label: "4 pieces", price: 65 }, { label: "8 pieces", price: 125 }] },
      { id: "signature-wasabi-parcel", name: "Wasabi parcel", description: "A spicy sandwich of seaweed and sushi rice with fresh salmon, Japanese mayo and wasabi.", spicy: true, variants: [{ label: "4 pieces", price: 70 }, { label: "8 pieces", price: 135 }] },
      { id: "signature-gift-wrapped-salmon", name: "Gift wrapped salmon", description: "Fresh salmon and avocado wrapped with salmon, Quepee mayo and caviar.", variants: [{ label: "4 pieces", price: 65 }, { label: "8 pieces", price: 125 }] },
      { id: "signature-tempura-dragon-roll", name: "Tempura dragon roll", description: "Tempura prawns with creamy avocado and sweet chilli cheese.", variants: [{ label: "4 pieces", price: 60 }, { label: "8 pieces", price: 115 }] },
      { id: "signature-tiger-roll", name: "Tiger roll", description: "Tempura prawns, creamy avocado and sweet chilli cheese, topped with prawn and avocado.", variants: [{ label: "4 pieces", price: 70 }, { label: "8 pieces", price: 135 }] },
      { id: "signature-tempura-fried-sushi", name: "Tempura fried sushi", description: "California roll with your choice of catch, avocado and cream cheese, tempura-coated and fried.", variants: [{ label: "4 pieces", price: 60 }, { label: "8 pieces", price: 115 }] },
      { id: "signature-spicy-tempura-shrimp", name: "Spicy tempura shrimp roll", description: "California roll topped with golden-brown tempura prawns and spicy sweet chilli mayo.", spicy: true, variants: [{ label: "4 pieces", price: 75 }, { label: "8 pieces", price: 145 }] },
      { id: "signature-spring-rolls", name: "Spring rolls", description: "Traditional golden-brown fried or air-fried spring rolls.", variants: [{ label: "4 pieces", price: 70 }, { label: "8 pieces", price: 135 }] },
      { id: "signature-tempura-prawns", name: "Tempura prawns", description: "Golden-brown fried or air-fried tempura prawns with sweet chilli sauce.", variants: [{ label: "4 pieces", price: 70 }, { label: "8 pieces", price: 135 }] },
      { id: "signature-vegetarian-dragon-roll", name: "Vegetarian dragon roll", description: "Cucumber, tofu, creamy avocado and sweet chilli cheese.", vegetarian: true, variants: [{ label: "4 pieces", price: 55 }, { label: "8 pieces", price: 105 }] },
      { id: "signature-best-of-both", name: "Best of both", description: "Tempura prawns, creamy avocado and sweet chilli cheese, topped with salmon.", variants: [{ label: "4 pieces", price: 70 }, { label: "8 pieces", price: 135 }] }
    ]
  },
  {
    id: "platters",
    name: "Platters",
    image: "assets/sharing-table.jpg",
    products: [
      { id: "platter-chopstick", name: "Chopstick platter", description: "12 pieces: 2 salmon roses, 2 fashion sandwiches, 4 California rolls and 4 rainbow rolls.", variants: [{ label: "12 pieces", price: 145 }] },
      { id: "platter-couples", name: "Couple's platter", description: "24 pieces with salmon roses, fashion sandwiches, California and rainbow rolls, tempura dragon rolls, nigiri and maki.", variants: [{ label: "24 pieces", price: 305 }] },
      { id: "platter-picnic", name: "Picnic platter", description: "54 pieces with California and rainbow rolls, bean curd nigiri, fashion sandwiches, salmon roses, tempura dragon rolls and Best of Both.", variants: [{ label: "54 pieces", price: 655 }] },
      { id: "platter-vacation", name: "Vacation platter", description: "82 pieces with salmon roses, California and rainbow rolls, fashion sandwiches, sashimi, nigiri, maki and tempura dragon rolls.", variants: [{ label: "82 pieces", price: 995 }] },
      { id: "platter-party-monster", name: "Party monster", description: "136 assorted pieces. Ask us about the full selection.", variants: [{ label: "136 pieces", price: 1650 }] }
    ]
  },
  {
    id: "extras",
    name: "Extras",
    image: "assets/small-plates.jpg",
    products: [
      { id: "extra-wasabi", name: "Wasabi", variants: [{ label: "1 portion", price: 10 }] },
      { id: "extra-ginger", name: "Ginger", variants: [{ label: "1 portion", price: 10 }] },
      { id: "extra-soy-sauce", name: "Soy sauce", variants: [{ label: "1 portion", price: 10 }] },
      { id: "extra-quepee-mayo", name: "Quepee mayo", variants: [{ label: "1 portion", price: 10 }] },
      { id: "extra-chopstick", name: "Chopstick", variants: [{ label: "1 piece", price: 5 }] }
    ]
  }
];

if (typeof module !== "undefined" && module.exports) module.exports = chopstickMenuData;
if (typeof window !== "undefined") window.CHOPSTICK_MENU = chopstickMenuData;
