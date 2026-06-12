"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Alien,
  Armchair,
  Axe,
  Baby,
  Balloon,
  Basket,
  Basketball,
  BeerStein,
  Bicycle,
  Bone,
  Book,
  BowlingBall,
  Bread,
  Bus,
  Campfire,
  Cat,
  Check,
  Coffee,
  CoffeeBean,
  Confetti,
  Cookie,
  Crown,
  CurrencyCircleDollar,
  CurrencyDollar,
  CurrencyEur,
  CurrencyGbp,
  Diamond,
  DiscoBall,
  Dog,
  Dress,
  EyeClosed,
  Eyeglasses,
  FilmSlate,
  Fire,
  Flag,
  FlagBannerFold,
  Flame,
  Flower,
  FlowerTulip,
  FlyingSaucer,
  Footprints,
  ForkKnife,
  GameController,
  Ghost,
  Gift,
  Globe,
  Golf,
  GraduationCap,
  Guitar,
  Hamburger,
  HandHeart,
  HandPeace,
  HandWaving,
  Headphones,
  Heart,
  HighHeel,
  IceCream,
  Key,
  Laptop,
  Leaf,
  Lightbulb,
  Lightning,
  MagnifyingGlass,
  Martini,
  Megaphone,
  Money,
  MusicNote,
  MusicNotes,
  PaintBrushHousehold,
  Pants,
  PawPrint,
  Percent,
  PiggyBank,
  Pizza,
  Popcorn,
  RocketLaunch,
  Scissors,
  SealCheck,
  SealPercent,
  ShootingStar,
  ShoppingBag,
  ShoppingCartSimple,
  SketchLogo,
  Smiley,
  SmileyWink,
  Sneaker,
  Sparkle,
  Stamp,
  Star,
  Sun,
  Sunglasses,
  Tag,
  TeaBag,
  ThumbsUp,
  Ticket,
  TipJar,
  Trophy,
  TShirt,
  VinylRecord,
} from "@phosphor-icons/react";
import type { ComponentType, SVGProps } from "react";
import { Input } from "@/components/ui/input";

type PhosphorIcon = ComponentType<
  SVGProps<SVGSVGElement> & {
    weight?: "thin" | "light" | "regular" | "bold" | "fill" | "duotone";
  }
>;

export type StampIconCategory =
  | "foodDrink"
  | "activitiesLeisure"
  | "retailFashion"
  | "beautyNature"
  | "animals"
  | "peopleSmileys"
  | "moneyRewards"
  | "symbolsMisc";

/** Order in which category groups render in the picker. */
export const ICON_CATEGORIES: StampIconCategory[] = [
  "foodDrink",
  "activitiesLeisure",
  "retailFashion",
  "beautyNature",
  "animals",
  "peopleSmileys",
  "moneyRewards",
  "symbolsMisc",
];

interface StampIconEntry {
  id: string;
  /** English label, used as a search fallback and aria-label. */
  label: string;
  Icon: PhosphorIcon;
  category: StampIconCategory;
}

/**
 * Canonical icon registry. The `id` is the cross-system contract: it must
 * match the SVG filename in backend/assets/icons/ and the entry in the
 * showcase repo's copy of this registry. New icons use the Phosphor kebab
 * name; legacy ids (checkmark, food, music, paw, shopping, thumbsup, tea)
 * predate that convention and stay as-is.
 */
const STAMP_ICONS = [
  // Food & drink
  { id: "coffee", label: "Coffee", Icon: Coffee, category: "foodDrink" },
  { id: "coffee-bean", label: "Coffee bean", Icon: CoffeeBean, category: "foodDrink" },
  { id: "tea", label: "Tea", Icon: TeaBag, category: "foodDrink" },
  { id: "bread", label: "Bread", Icon: Bread, category: "foodDrink" },
  { id: "food", label: "Food", Icon: ForkKnife, category: "foodDrink" },
  { id: "hamburger", label: "Burger", Icon: Hamburger, category: "foodDrink" },
  { id: "pizza", label: "Pizza", Icon: Pizza, category: "foodDrink" },
  { id: "cookie", label: "Cookie", Icon: Cookie, category: "foodDrink" },
  { id: "ice-cream", label: "Ice cream", Icon: IceCream, category: "foodDrink" },
  { id: "popcorn", label: "Popcorn", Icon: Popcorn, category: "foodDrink" },
  { id: "beer-stein", label: "Beer", Icon: BeerStein, category: "foodDrink" },
  { id: "martini", label: "Cocktail", Icon: Martini, category: "foodDrink" },
  // Activities & leisure
  { id: "basketball", label: "Basketball", Icon: Basketball, category: "activitiesLeisure" },
  { id: "bowling-ball", label: "Bowling", Icon: BowlingBall, category: "activitiesLeisure" },
  { id: "golf", label: "Golf", Icon: Golf, category: "activitiesLeisure" },
  { id: "bicycle", label: "Bicycle", Icon: Bicycle, category: "activitiesLeisure" },
  { id: "game-controller", label: "Gaming", Icon: GameController, category: "activitiesLeisure" },
  { id: "guitar", label: "Guitar", Icon: Guitar, category: "activitiesLeisure" },
  { id: "headphones", label: "Headphones", Icon: Headphones, category: "activitiesLeisure" },
  { id: "music", label: "Music note", Icon: MusicNote, category: "activitiesLeisure" },
  { id: "music-notes", label: "Music notes", Icon: MusicNotes, category: "activitiesLeisure" },
  { id: "vinyl-record", label: "Vinyl", Icon: VinylRecord, category: "activitiesLeisure" },
  { id: "disco-ball", label: "Disco ball", Icon: DiscoBall, category: "activitiesLeisure" },
  { id: "film-slate", label: "Cinema", Icon: FilmSlate, category: "activitiesLeisure" },
  { id: "campfire", label: "Campfire", Icon: Campfire, category: "activitiesLeisure" },
  { id: "book", label: "Book", Icon: Book, category: "activitiesLeisure" },
  { id: "graduation-cap", label: "Graduation", Icon: GraduationCap, category: "activitiesLeisure" },
  { id: "ticket", label: "Ticket", Icon: Ticket, category: "activitiesLeisure" },
  // Retail & fashion
  { id: "shopping", label: "Shopping bag", Icon: ShoppingBag, category: "retailFashion" },
  { id: "shopping-cart-simple", label: "Cart", Icon: ShoppingCartSimple, category: "retailFashion" },
  { id: "basket", label: "Basket", Icon: Basket, category: "retailFashion" },
  { id: "tag", label: "Tag", Icon: Tag, category: "retailFashion" },
  { id: "dress", label: "Dress", Icon: Dress, category: "retailFashion" },
  { id: "pants", label: "Pants", Icon: Pants, category: "retailFashion" },
  { id: "t-shirt", label: "T-shirt", Icon: TShirt, category: "retailFashion" },
  { id: "sneaker", label: "Sneaker", Icon: Sneaker, category: "retailFashion" },
  { id: "high-heel", label: "High heel", Icon: HighHeel, category: "retailFashion" },
  { id: "sunglasses", label: "Sunglasses", Icon: Sunglasses, category: "retailFashion" },
  { id: "eyeglasses", label: "Glasses", Icon: Eyeglasses, category: "retailFashion" },
  { id: "armchair", label: "Armchair", Icon: Armchair, category: "retailFashion" },
  { id: "key", label: "Key", Icon: Key, category: "retailFashion" },
  // Beauty & nature
  { id: "scissors", label: "Scissors", Icon: Scissors, category: "beautyNature" },
  { id: "eye-closed", label: "Lashes", Icon: EyeClosed, category: "beautyNature" },
  { id: "paint-brush-household", label: "Paint brush", Icon: PaintBrushHousehold, category: "beautyNature" },
  { id: "flower", label: "Flower", Icon: Flower, category: "beautyNature" },
  { id: "flower-tulip", label: "Tulip", Icon: FlowerTulip, category: "beautyNature" },
  { id: "leaf", label: "Leaf", Icon: Leaf, category: "beautyNature" },
  { id: "sun", label: "Sun", Icon: Sun, category: "beautyNature" },
  { id: "sparkle", label: "Sparkle", Icon: Sparkle, category: "beautyNature" },
  // Animals
  { id: "paw", label: "Paw", Icon: PawPrint, category: "animals" },
  { id: "cat", label: "Cat", Icon: Cat, category: "animals" },
  { id: "dog", label: "Dog", Icon: Dog, category: "animals" },
  { id: "bone", label: "Bone", Icon: Bone, category: "animals" },
  { id: "footprints", label: "Footprints", Icon: Footprints, category: "animals" },
  // People & smileys
  { id: "smiley", label: "Smiley", Icon: Smiley, category: "peopleSmileys" },
  { id: "smiley-wink", label: "Wink", Icon: SmileyWink, category: "peopleSmileys" },
  { id: "thumbsup", label: "Thumbs up", Icon: ThumbsUp, category: "peopleSmileys" },
  { id: "hand-waving", label: "Waving hand", Icon: HandWaving, category: "peopleSmileys" },
  { id: "hand-peace", label: "Peace", Icon: HandPeace, category: "peopleSmileys" },
  { id: "hand-heart", label: "Caring hand", Icon: HandHeart, category: "peopleSmileys" },
  { id: "heart", label: "Heart", Icon: Heart, category: "peopleSmileys" },
  { id: "baby", label: "Baby", Icon: Baby, category: "peopleSmileys" },
  { id: "ghost", label: "Ghost", Icon: Ghost, category: "peopleSmileys" },
  // Money & rewards
  { id: "gift", label: "Gift", Icon: Gift, category: "moneyRewards" },
  { id: "trophy", label: "Trophy", Icon: Trophy, category: "moneyRewards" },
  { id: "crown", label: "Crown", Icon: Crown, category: "moneyRewards" },
  { id: "diamond", label: "Diamond", Icon: Diamond, category: "moneyRewards" },
  { id: "star", label: "Star", Icon: Star, category: "moneyRewards" },
  { id: "percent", label: "Percent", Icon: Percent, category: "moneyRewards" },
  { id: "seal-percent", label: "Discount seal", Icon: SealPercent, category: "moneyRewards" },
  { id: "seal-check", label: "Check seal", Icon: SealCheck, category: "moneyRewards" },
  { id: "money", label: "Money", Icon: Money, category: "moneyRewards" },
  { id: "currency-dollar", label: "Dollar", Icon: CurrencyDollar, category: "moneyRewards" },
  { id: "currency-circle-dollar", label: "Dollar coin", Icon: CurrencyCircleDollar, category: "moneyRewards" },
  { id: "currency-eur", label: "Euro", Icon: CurrencyEur, category: "moneyRewards" },
  { id: "currency-gbp", label: "Pound", Icon: CurrencyGbp, category: "moneyRewards" },
  { id: "piggy-bank", label: "Piggy bank", Icon: PiggyBank, category: "moneyRewards" },
  { id: "tip-jar", label: "Tip jar", Icon: TipJar, category: "moneyRewards" },
  // Symbols & misc
  { id: "checkmark", label: "Check", Icon: Check, category: "symbolsMisc" },
  { id: "confetti", label: "Confetti", Icon: Confetti, category: "symbolsMisc" },
  { id: "balloon", label: "Balloon", Icon: Balloon, category: "symbolsMisc" },
  { id: "shooting-star", label: "Shooting star", Icon: ShootingStar, category: "symbolsMisc" },
  { id: "sketch-logo", label: "Gem", Icon: SketchLogo, category: "symbolsMisc" },
  { id: "lightning", label: "Bolt", Icon: Lightning, category: "symbolsMisc" },
  { id: "fire", label: "Fire", Icon: Fire, category: "symbolsMisc" },
  { id: "flame", label: "Flame", Icon: Flame, category: "symbolsMisc" },
  { id: "megaphone", label: "Megaphone", Icon: Megaphone, category: "symbolsMisc" },
  { id: "lightbulb", label: "Lightbulb", Icon: Lightbulb, category: "symbolsMisc" },
  { id: "rocket-launch", label: "Rocket", Icon: RocketLaunch, category: "symbolsMisc" },
  { id: "flying-saucer", label: "Flying saucer", Icon: FlyingSaucer, category: "symbolsMisc" },
  { id: "alien", label: "Alien", Icon: Alien, category: "symbolsMisc" },
  { id: "globe", label: "Globe", Icon: Globe, category: "symbolsMisc" },
  { id: "flag", label: "Flag", Icon: Flag, category: "symbolsMisc" },
  { id: "flag-banner-fold", label: "Banner", Icon: FlagBannerFold, category: "symbolsMisc" },
  { id: "stamp", label: "Stamp", Icon: Stamp, category: "symbolsMisc" },
  { id: "laptop", label: "Laptop", Icon: Laptop, category: "symbolsMisc" },
  { id: "bus", label: "Bus", Icon: Bus, category: "symbolsMisc" },
  { id: "axe", label: "Axe", Icon: Axe, category: "symbolsMisc" },
] as const satisfies readonly StampIconEntry[];

export type StampIconType = (typeof STAMP_ICONS)[number]["id"];

export const iconMap: Record<string, PhosphorIcon> = Object.fromEntries(
  STAMP_ICONS.map(({ id, Icon }) => [id, Icon]),
);

/** Curated subset suggested for the final (reward) stamp. The full library
 *  stays available behind it — this is guidance, not a restriction. */
export const REWARD_ICON_IDS: StampIconType[] = [
  "gift",
  "trophy",
  "star",
  "crown",
  "diamond",
  "sparkle",
  "heart",
  "percent",
  "confetti",
  "balloon",
  "seal-percent",
  "seal-check",
  "ticket",
  "shooting-star",
  "tip-jar",
  "sketch-logo",
];

/** Lowercase + strip accents so "café" matches "cafe". */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

interface IconButtonProps {
  readonly entry: StampIconEntry;
  readonly selected: boolean;
  readonly accentColor: string;
  readonly iconColor: string;
  readonly displayName: string;
  readonly onClick: () => void;
}

function IconButton({ entry, selected, accentColor, iconColor, displayName, onClick }: IconButtonProps) {
  const { Icon } = entry;
  return (
    <button
      type="button"
      onClick={onClick}
      title={displayName}
      className="w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200 hover:scale-110 mx-auto"
      style={{
        backgroundColor: selected ? accentColor : "hsl(var(--muted))",
      }}
      aria-label={displayName}
    >
      <Icon className="w-4 h-4" weight="bold" style={{ color: selected ? iconColor : undefined }} />
    </button>
  );
}

interface IconLibraryProps {
  readonly value: StampIconType;
  readonly onChange: (icon: StampIconType) => void;
  readonly accentColor?: string;
  /** Color of the icon glyph itself when the stamp is selected — should
   *  match `design.icon_color` so the picker previews exactly what the
   *  customer will see on their pass. Defaults to white. */
  readonly iconColor?: string;
  /** Ids pinned in a "Suggested" section above the categories (e.g. the
   *  curated reward icons). The full library stays browsable below. */
  readonly suggested?: StampIconType[];
}

/**
 * The full searchable, categorized icon library. Rendered inline by
 * StampIconPicker or inside IconPickerField's popover.
 */
export function IconLibrary({
  value,
  onChange,
  accentColor = "#f97316",
  iconColor = "#ffffff",
  suggested,
}: IconLibraryProps) {
  const t = useTranslations("designEditor.iconPicker");
  const tNames = useTranslations("designEditor");
  const [query, setQuery] = useState("");

  // Localized icon names, keyed by icon id. Used for search + button titles;
  // falls back to the English label in the registry when a key is missing.
  const localizedNames = useMemo(() => {
    const raw = tNames.raw("iconNames") as Record<string, string> | undefined;
    return raw ?? {};
  }, [tNames]);

  const displayName = (entry: StampIconEntry) => localizedNames[entry.id] ?? entry.label;

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return null;
    return STAMP_ICONS.filter((entry) => {
      const haystack = [entry.id, entry.label, localizedNames[entry.id] ?? ""];
      return haystack.some((h) => normalize(h).includes(q));
    });
  }, [query, localizedNames]);

  const suggestedEntries = useMemo(
    () =>
      (suggested ?? [])
        .map((id) => STAMP_ICONS.find((entry) => entry.id === id))
        .filter((entry): entry is (typeof STAMP_ICONS)[number] => !!entry),
    [suggested]
  );

  const renderGrid = (entries: readonly (typeof STAMP_ICONS)[number][]) => (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(40px,1fr))] gap-y-2 gap-x-1">
      {entries.map((entry) => (
        <IconButton
          key={entry.id}
          entry={entry}
          selected={value === entry.id}
          accentColor={accentColor}
          iconColor={iconColor}
          displayName={displayName(entry)}
          onClick={() => onChange(entry.id)}
        />
      ))}
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="pl-9 h-9"
        />
      </div>

      <div className="max-h-64 overflow-y-auto pr-1 -mr-1">
        {filtered ? (
          filtered.length > 0 ? (
            renderGrid(filtered)
          ) : (
            <p className="text-sm text-muted-foreground py-2">{t("noResults")}</p>
          )
        ) : (
          <div className="flex flex-col gap-4">
            {suggestedEntries.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium text-muted-foreground">
                  {t("suggested")}
                </p>
                {renderGrid(suggestedEntries)}
              </div>
            )}
            {ICON_CATEGORIES.map((category) => (
              <div key={category} className="flex flex-col gap-2">
                <p className="text-xs font-medium text-muted-foreground">
                  {t(`categories.${category}`)}
                </p>
                {renderGrid(STAMP_ICONS.filter((entry) => entry.category === category))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function StampIconPicker(props: IconLibraryProps) {
  return <IconLibrary {...props} />;
}

/** Localized display name for an icon id (falls back to the English label). */
export function useIconDisplayName(): (id: StampIconType) => string {
  const tNames = useTranslations("designEditor");
  const names = (tNames.raw("iconNames") as Record<string, string> | undefined) ?? {};
  return (id) =>
    names[id] ?? STAMP_ICONS.find((entry) => entry.id === id)?.label ?? id;
}

interface StampIconSvgProps {
  readonly icon: StampIconType;
  readonly className?: string;
  readonly color?: string;
}

export function StampIconSvg({ icon, className = "w-4 h-4", color }: StampIconSvgProps) {
  const Icon = iconMap[icon] || Check;
  const weight = icon === "checkmark" ? "bold" : "fill";
  return <Icon className={className} weight={weight} style={color ? { color } : undefined} />;
}
