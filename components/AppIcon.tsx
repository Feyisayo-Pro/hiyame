import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';
import {
  ArrowCircleRight, ArrowLeft, ArrowRight, ArrowsClockwise, ArrowsLeftRight, Bell, BookmarkSimple,
  Briefcase, Buildings, Calendar, Camera, CaretDown, CaretRight, CaretUp, ChartBar, ChatCircle, ChatCircleDots,
  Check, CheckCircle, Clock, CloudArrowUp, CloudSlash, Code, Compass, CreditCard, Crown, DeviceMobile,
  EnvelopeSimple, EnvelopeSimpleOpen, Eye, EyeSlash, FileText, Gear, Globe, House, IdentificationCard,
  Info, Key, Leaf, Lifebuoy, Lightning, Link, Lock, MagnifyingGlass, MapPin, Money, Moon, PaperPlaneTilt,
  PencilSimple, Plus, PlusCircle, Question, Rocket, RocketLaunch, SealCheck, Shield, ShieldCheck,
  SignIn, SignOut, Sparkle, Star, StopCircle, Sun, Trash, User, UserCircle, UserPlus, Users, UsersThree,
  VideoCamera, Warning, WarningCircle, X, XCircle,
} from 'phosphor-react-native';

// Premium icon set, swapped in app-wide for the generic Ionicons everyone's
// AI-generated app ships with. This wrapper keeps the exact drop-in API
// every screen already calls Ionicons with (`name`/`size`/`color`/`style`)
// so the whole app-wide swap was a call-site rename, not a rewrite — the
// actual icon choice + line-weight per name lives in this one table.
type PhosphorWeight = ComponentProps<typeof House>['weight'];

const MAP: Record<string, { Icon: typeof House; weight: PhosphorWeight }> = {
  'account-group-outline': { Icon: UsersThree, weight: 'regular' },
  'add': { Icon: Plus, weight: 'regular' },
  'add-circle-outline': { Icon: PlusCircle, weight: 'regular' },
  'alert-circle': { Icon: WarningCircle, weight: 'fill' },
  'alert-circle-outline': { Icon: WarningCircle, weight: 'regular' },
  'arrow-back': { Icon: ArrowLeft, weight: 'regular' },
  'arrow-forward': { Icon: ArrowRight, weight: 'regular' },
  'arrow-forward-circle': { Icon: ArrowCircleRight, weight: 'fill' },
  'arrow-forward-circle-outline': { Icon: ArrowCircleRight, weight: 'regular' },
  'bar-chart': { Icon: ChartBar, weight: 'fill' },
  'bar-chart-outline': { Icon: ChartBar, weight: 'regular' },
  'bookmark-outline': { Icon: BookmarkSimple, weight: 'regular' },
  'briefcase': { Icon: Briefcase, weight: 'fill' },
  'briefcase-outline': { Icon: Briefcase, weight: 'regular' },
  'business': { Icon: Buildings, weight: 'fill' },
  'business-outline': { Icon: Buildings, weight: 'regular' },
  'calendar-outline': { Icon: Calendar, weight: 'regular' },
  'camera': { Icon: Camera, weight: 'fill' },
  'camera-outline': { Icon: Camera, weight: 'regular' },
  'card-outline': { Icon: CreditCard, weight: 'regular' },
  'cash-outline': { Icon: Money, weight: 'regular' },
  'chatbubble-ellipses-outline': { Icon: ChatCircleDots, weight: 'regular' },
  'chatbubble-outline': { Icon: ChatCircle, weight: 'regular' },
  'checkmark': { Icon: Check, weight: 'bold' },
  'checkmark-circle': { Icon: CheckCircle, weight: 'fill' },
  'checkmark-circle-outline': { Icon: CheckCircle, weight: 'regular' },
  'checkmark-done-circle': { Icon: CheckCircle, weight: 'fill' },
  'chevron-down': { Icon: CaretDown, weight: 'bold' },
  'chevron-forward': { Icon: CaretRight, weight: 'bold' },
  'chevron-up': { Icon: CaretUp, weight: 'bold' },
  'close': { Icon: X, weight: 'bold' },
  'close-circle-outline': { Icon: XCircle, weight: 'regular' },
  'cloud-offline-outline': { Icon: CloudSlash, weight: 'regular' },
  'cloud-upload-outline': { Icon: CloudArrowUp, weight: 'regular' },
  'code-slash-outline': { Icon: Code, weight: 'regular' },
  'compass-outline': { Icon: Compass, weight: 'regular' },
  'create-outline': { Icon: PencilSimple, weight: 'regular' },
  'crown-outline': { Icon: Crown, weight: 'regular' },
  'decagram': { Icon: SealCheck, weight: 'fill' },
  'document-text-outline': { Icon: FileText, weight: 'regular' },
  'eye-off-outline': { Icon: EyeSlash, weight: 'regular' },
  'eye-outline': { Icon: Eye, weight: 'regular' },
  'flash': { Icon: Lightning, weight: 'fill' },
  'globe-outline': { Icon: Globe, weight: 'regular' },
  'help-buoy-outline': { Icon: Lifebuoy, weight: 'regular' },
  'help-circle-outline': { Icon: Question, weight: 'regular' },
  'home': { Icon: House, weight: 'fill' },
  'home-outline': { Icon: House, weight: 'regular' },
  'id-card-outline': { Icon: IdentificationCard, weight: 'regular' },
  'information-circle': { Icon: Info, weight: 'fill' },
  'information-circle-outline': { Icon: Info, weight: 'regular' },
  'key-outline': { Icon: Key, weight: 'regular' },
  'leaf': { Icon: Leaf, weight: 'fill' },
  'location-outline': { Icon: MapPin, weight: 'regular' },
  'link': { Icon: Link, weight: 'regular' },
  'lock-closed': { Icon: Lock, weight: 'fill' },
  'lock-closed-outline': { Icon: Lock, weight: 'regular' },
  'log-out-outline': { Icon: SignOut, weight: 'regular' },
  'log-in-outline': { Icon: SignIn, weight: 'regular' },
  'mail-outline': { Icon: EnvelopeSimple, weight: 'regular' },
  'mail-unread': { Icon: EnvelopeSimpleOpen, weight: 'fill' },
  'moon-outline': { Icon: Moon, weight: 'regular' },
  'notifications': { Icon: Bell, weight: 'fill' },
  'notifications-outline': { Icon: Bell, weight: 'regular' },
  'paper-plane': { Icon: PaperPlaneTilt, weight: 'fill' },
  'paper-plane-outline': { Icon: PaperPlaneTilt, weight: 'regular' },
  'people': { Icon: Users, weight: 'fill' },
  'people-circle-outline': { Icon: UserCircle, weight: 'regular' },
  'people-outline': { Icon: Users, weight: 'regular' },
  'person': { Icon: User, weight: 'fill' },
  'person-add': { Icon: UserPlus, weight: 'regular' },
  'person-outline': { Icon: User, weight: 'regular' },
  'phone-portrait-outline': { Icon: DeviceMobile, weight: 'regular' },
  'refresh': { Icon: ArrowsClockwise, weight: 'bold' },
  'rocket-launch': { Icon: RocketLaunch, weight: 'fill' },
  'rocket-outline': { Icon: Rocket, weight: 'regular' },
  'search': { Icon: MagnifyingGlass, weight: 'regular' },
  'settings-outline': { Icon: Gear, weight: 'regular' },
  'shield-checkmark': { Icon: ShieldCheck, weight: 'fill' },
  'shield-checkmark-outline': { Icon: ShieldCheck, weight: 'regular' },
  'shield-outline': { Icon: Shield, weight: 'regular' },
  'sparkles': { Icon: Sparkle, weight: 'fill' },
  'sparkles-outline': { Icon: Sparkle, weight: 'regular' },
  'star': { Icon: Star, weight: 'fill' },
  'star-outline': { Icon: Star, weight: 'regular' },
  'stop-circle-outline': { Icon: StopCircle, weight: 'regular' },
  'stats-chart-outline': { Icon: ChartBar, weight: 'regular' },
  'sunny-outline': { Icon: Sun, weight: 'regular' },
  'swap-horizontal': { Icon: ArrowsLeftRight, weight: 'bold' },
  'swap-horizontal-outline': { Icon: ArrowsLeftRight, weight: 'regular' },
  'sync-circle': { Icon: ArrowsClockwise, weight: 'regular' },
  'time-outline': { Icon: Clock, weight: 'regular' },
  'trash-outline': { Icon: Trash, weight: 'regular' },
  'videocam-outline': { Icon: VideoCamera, weight: 'regular' },
  'warning-outline': { Icon: Warning, weight: 'regular' },
};

// Falls back to a neutral, visible placeholder (rather than throwing or
// rendering nothing) for any name this table doesn't yet cover — safer for
// the handful of call sites that pick a name dynamically from data/config,
// which a static grep for JSX literals can miss.
const FALLBACK = { Icon: Question, weight: 'regular' as PhosphorWeight };

export type AppIconName = keyof typeof MAP;

interface Props {
  name: string;
  size?: number;
  // React Navigation's tab bar hands back `ColorValue` (string | OpaqueColorValue,
  // the latter only for native PlatformColor()/DynamicColorIOS() — never used in
  // this app, which only ever passes plain hex/rgba strings from lib/theme.ts).
  // Widened here so those call sites don't need a cast; Phosphor's underlying SVG
  // color prop only understands a real string, hence the coercion below.
  color?: ColorValue;
  style?: ComponentProps<typeof House>['style'];
}

export default function AppIcon({ name, size = 24, color = '#000', style }: Props) {
  const entry = MAP[name] ?? FALLBACK;
  if (!MAP[name] && __DEV__) {
    // eslint-disable-next-line no-console
    console.warn(`AppIcon: no phosphor mapping for "${name}", using fallback`);
  }
  const { Icon, weight } = entry;
  return <Icon size={size} color={color as string} weight={weight} style={style} />;
}
