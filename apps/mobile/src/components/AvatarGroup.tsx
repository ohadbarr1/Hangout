import { View, Text, Image } from 'react-native';

interface AvatarUser {
  id: string;
  name: string;
  avatar_url: string | null;
}

interface AvatarGroupProps {
  users: AvatarUser[];
  maxVisible?: number;
  size?: number;
  borderColor?: string;
}

const AVATAR_COLORS = [
  '#FF6B4A', '#7B61FF', '#FFD166', '#06D6A0', '#FF9472', '#9985FF',
];

export function AvatarGroup({
  users,
  maxVisible = 4,
  size = 36,
  borderColor = '#FFFFFF',
}: AvatarGroupProps) {
  const visible = users.slice(0, maxVisible);
  const overflow = users.length - visible.length;
  const overlap = Math.floor(size * 0.3);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        // Total width: size + (n-1) * (size - overlap)
        width: visible.length * (size - overlap) + overlap + (overflow > 0 ? size - overlap : 0),
      }}
    >
      {visible.map((user, index) => {
        const bg = AVATAR_COLORS[index % AVATAR_COLORS.length] ?? '#FF6B4A';
        return (
          <View
            key={user.id}
            style={{
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: 2,
              borderColor,
              overflow: 'hidden',
              backgroundColor: `${bg}25`,
              alignItems: 'center',
              justifyContent: 'center',
              position: 'absolute',
              left: index * (size - overlap),
              zIndex: visible.length - index,
            }}
          >
            {user.avatar_url ? (
              <Image
                source={{ uri: user.avatar_url }}
                style={{ width: size - 4, height: size - 4, borderRadius: (size - 4) / 2 }}
              />
            ) : (
              <Text
                style={{
                  fontFamily: 'PlusJakartaSans-Bold',
                  fontSize: size * 0.38,
                  color: bg,
                }}
              >
                {user.name.charAt(0).toUpperCase()}
              </Text>
            )}
          </View>
        );
      })}

      {overflow > 0 && (
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: 2,
            borderColor,
            backgroundColor: 'rgba(26,26,46,0.12)',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'absolute',
            left: visible.length * (size - overlap),
            zIndex: 0,
          }}
        >
          <Text
            style={{
              fontFamily: 'Inter-Medium',
              fontSize: size * 0.3,
              color: '#44446A',
            }}
          >
            +{overflow}
          </Text>
        </View>
      )}
    </View>
  );
}
