export type BuilderOption = {
  id: string;
  name: string;
  price: number;
  isAvailable: boolean;
  category?: string;
  isPremium?: boolean;
};

export const CUSTOM_MEAL_BASE_PRICE = 1_000;

export const BUILDER_OPTIONS = {
  swallows: [
    { id: "sw1", name: "Amala", price: 0, isAvailable: true },
    { id: "sw2", name: "Eba (Garri)", price: 0, isAvailable: true },
    { id: "sw3", name: "Semo", price: 200, isAvailable: true },
    { id: "sw4", name: "Pounded Yam", price: 500, isAvailable: true },
    { id: "sw5", name: "Wheat", price: 200, isAvailable: true },
    { id: "sw6", name: "Fufu", price: 0, isAvailable: false },
  ],
  soups: [
    { id: "so1", name: "Ewedu", price: 0, isAvailable: true },
    { id: "so2", name: "Gbegiri", price: 0, isAvailable: true },
    { id: "so3", name: "Egusi", price: 300, isAvailable: true },
    { id: "so4", name: "Efo Riro", price: 300, isAvailable: true },
    { id: "so5", name: "Okra (Ila)", price: 200, isAvailable: true },
    { id: "so6", name: "Ogbono", price: 200, isAvailable: true },
    { id: "so7", name: "Bitterleaf", price: 200, isAvailable: false },
  ],
  proteins: [
    { id: "pr1", name: "Beef", price: 500, isAvailable: true, isPremium: false },
    { id: "pr2", name: "Assorted Meat", price: 700, isAvailable: true, isPremium: false },
    { id: "pr3", name: "Goat Meat", price: 800, isAvailable: true, isPremium: false },
    { id: "pr4", name: "Fish (Titus)", price: 600, isAvailable: true, isPremium: false },
    { id: "pr5", name: "Turkey", price: 900, isAvailable: true, isPremium: false },
    { id: "pr6", name: "Chicken", price: 800, isAvailable: true, isPremium: false },
    { id: "pr7", name: "Ponmo", price: 400, isAvailable: true, isPremium: false },
    { id: "pr8", name: "Snail", price: 1_200, isAvailable: true, isPremium: true },
    { id: "pr9", name: "Shrimp", price: 1_000, isAvailable: false, isPremium: true },
  ],
  extras: [
    { id: "ex1", name: "Extra Soup", price: 300, isAvailable: true, category: "soup" },
    { id: "ex2", name: "Extra Stew", price: 300, isAvailable: true, category: "stew" },
    { id: "ex3", name: "Extra Protein", price: 500, isAvailable: true, category: "protein" },
    { id: "ex4", name: "Extra Swallow", price: 300, isAvailable: true, category: "swallow" },
    { id: "ex5", name: "Plantain", price: 400, isAvailable: true, category: "side" },
    { id: "ex6", name: "Coleslaw", price: 300, isAvailable: true, category: "side" },
    { id: "ex7", name: "Soft Drink", price: 300, isAvailable: true, category: "drink" },
    { id: "ex8", name: "Water", price: 150, isAvailable: true, category: "drink" },
    { id: "ex9", name: "Disposable Cutlery", price: 100, isAvailable: true, category: "other" },
  ],
} satisfies Record<string, BuilderOption[]>;

export function getBuilderOption(group: keyof typeof BUILDER_OPTIONS, id: string): BuilderOption {
  const option = BUILDER_OPTIONS[group].find((candidate) => candidate.id === id);
  if (!option || !option.isAvailable) {
    throw new Error(`Unknown or unavailable custom-meal option: ${group}/${id}`);
  }
  return option;
}
