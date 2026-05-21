import { Text } from 'react-native';

type IconName =
  | 'home'
  | 'grid'
  | 'drink'
  | 'cart'
  | 'user'
  | 'search'
  | 'star'
  | 'plus'
  | 'minus'
  | 'trash'
  | 'check'
  | 'arrow-right'
  | 'log-out';

const map: Record<IconName, string> = {
  home: '🏠',
  grid: '🗂️',
  drink: '🥤',
  cart: '🛒',
  user: '👤',
  search: '🔍',
  star: '⭐',
  plus: '＋',
  minus: '－',
  trash: '🗑️',
  check: '✓',
  'arrow-right': '›',
  'log-out': '⎋',
};

interface Props {
  name: IconName;
  size?: number;
  color?: string;
}

export default function Icon({ name, size = 18, color }: Props) {
  return (
    <Text style={{ fontSize: size, color, lineHeight: size * 1.2 }}>
      {map[name]}
    </Text>
  );
}
