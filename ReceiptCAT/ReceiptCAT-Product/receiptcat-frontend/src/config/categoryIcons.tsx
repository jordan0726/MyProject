// src/config/categoryIcons.tsx
// Category → Icon map (single source of truth).
// We use Phosphor (fill weight) as the main set, and selectively use MDI for
// categories where Phosphor lacks a good semantic match (e.g., drinks, eating_out).
// CategoryKey is the canonical domain identifier; labels belong to UI/i18n.

import type { ReactNode } from 'react';
import type { CategoryKey } from '@/types/categoryLabels'; // canonical category keys

// ────────────────────────────────────────────────────────────────────────────────
// Phosphor Icons (SSR build for Next.js)
// ────────────────────────────────────────────────────────────────────────────────
import {
  BabyIcon as PBaby,
  BarbellIcon as PBarbell,
  BeerBottleIcon as PBeerBottle,
  BreadIcon as PBread,
  CarIcon as PCar,
  CarrotIcon as PCarrot,
  CoffeeIcon as PCoffee,
  CookieIcon as PCookie,
  FilmStripIcon as PFilmStrip,
  FishIcon as PFish,
  LaptopIcon as PLaptop,
  LightningIcon as PLightning,
  PawPrintIcon as PPawPrint,
  TagIcon as PTag,
  TShirtIcon as PTShirt,
  GiftIcon as PGift,
} from '@phosphor-icons/react/dist/ssr';

// ────────────────────────────────────────────────────────────────────────────────
// Material Design Icons (MDI) via @mdi/react (paths from @mdi/js)
//   • Using size="1em" so icons scale with font-size like other sets
// ────────────────────────────────────────────────────────────────────────────────
import Icon from '@mdi/react';
import {
  mdiAirplane,
  mdiCupWater,
  mdiMedicalBag,
  mdiSilverwareForkKnife,
  mdiSprayBottle,
  mdiCow,
  mdiFaceManShimmer,
  mdiHammerWrench,
  mdiCreditCardOutline,
  mdiSnowflake,
  mdiHomeOutline,
} from '@mdi/js';

const PHOSPHOR_ICON_PROPS = { weight: "fill" } as const;

export const CATEGORY_ICONS: Record<CategoryKey, ReactNode> = {
  fruits_vegetables: <PCarrot {...PHOSPHOR_ICON_PROPS} />, // produce
  meat_seafood_deli: <PFish {...PHOSPHOR_ICON_PROPS} />, // meat & seafood (fish proxy)
  dairy_eggs_fridge: <Icon path={mdiCow} size="1em" />, // dairy/eggs (MDI cow)
  frozen: <Icon path={mdiSnowflake} size="1em" />, // frozen goods
  pantry_snacks: <PCookie {...PHOSPHOR_ICON_PROPS} />, // snacks/cookies
  bakery: <PBread {...PHOSPHOR_ICON_PROPS} />, // bakery
  coffee_tea: <PCoffee {...PHOSPHOR_ICON_PROPS} />, // coffee/tea
  drinks: <Icon path={mdiCupWater} size="1em" />, // general drinks
  liquor: <PBeerBottle {...PHOSPHOR_ICON_PROPS} />, // liquor
  eating_out: <Icon path={mdiSilverwareForkKnife} size="1em" />, // eating out (MDI fork+knife)
  health_medicine: <Icon path={mdiMedicalBag} size="1em" />, // health/medicine (MDI medical bag)
  personal_care_beauty: <Icon path={mdiFaceManShimmer} size="1em" />, // personal care/beauty (MDI face shimmer)
  cleaning_maintenance: <Icon path={mdiSprayBottle} size="1em" />, // cleaning (MDI spray bottle)
  baby_maternity: <PBaby {...PHOSPHOR_ICON_PROPS} />, // baby/maternity
  pets: <PPawPrint {...PHOSPHOR_ICON_PROPS} />, // pets
  clothing_footwear: <PTShirt {...PHOSPHOR_ICON_PROPS} />, // clothing/footwear
  electronics_tech: <PLaptop {...PHOSPHOR_ICON_PROPS} />, // electronics/tech
  home_lifestyle: <Icon path={mdiHomeOutline} size="1em" />, // home & lifestyle
  sports_fitness: <PBarbell {...PHOSPHOR_ICON_PROPS} />, // sports/fitness
  gifts_occasions: <PGift {...PHOSPHOR_ICON_PROPS} />, // gifts/occasions
  entertainment: <PFilmStrip {...PHOSPHOR_ICON_PROPS} />, // entertainment
  subscriptions_digital: <Icon path={mdiCreditCardOutline} size="1em" />, // subscriptions & digital services (MDI credit card)
  professional_services: <Icon path={mdiHammerWrench} size="1em" />, // professional services (MDI hammer+wrench)
  utilities_bills: <PLightning {...PHOSPHOR_ICON_PROPS} />, // utilities/bills
  transport_fuel: <PCar {...PHOSPHOR_ICON_PROPS} />, // transport/fuel
  travel_holidays: <Icon path={mdiAirplane} size="1em" />, // MDI airplane
  other: <PTag {...PHOSPHOR_ICON_PROPS} />, // other/misc
};
