import { Text, type TextProps } from 'react-native';

export type ThemedTextProps = TextProps & {
  variant?: 'default' | 'title' | 'subtitle' | 'caption' | 'link';
};

export function ThemedText({
  style,
  variant = 'default',
  className = '',
  ...rest
}: ThemedTextProps) {
  let variantStyles = '';

  switch (variant) {
    case 'title':
      variantStyles = 'font-visby-bold text-2xl';
      break;
    case 'subtitle':
      variantStyles = 'font-visby-medium text-lg';
      break;
    case 'caption':
      variantStyles = 'font-visby text-sm text-gray-500';
      break;
    case 'link':
      variantStyles = 'font-visby-medium text-blue-500 underline';
      break;
    default:
      variantStyles = 'font-visby text-base text-gray-900';
      break;
  }

  return <Text className={`${variantStyles} ${className}`} style={style} {...rest} />;
}
