// Port of Material's CircleAvatar (material/circle_avatar.dart) as the account screens use it:
// `CircleAvatar(radius: r, backgroundImage: AssetImage('assets/images/avatar.png'))`. The image
// covers a 2r circle. The primaryContainer background behind it never shows: avatar.png has no
// transparency.

import React from 'react';
import { Image } from 'react-native';

const avatar = require('../../assets/images/avatar.png');

export function CircleAvatar({ radius }: { radius: number }) {
  return (
    <Image
      source={avatar}
      resizeMethod="resize"
      resizeMode="cover"
      style={{ width: 2 * radius, height: 2 * radius, borderRadius: radius }}
    />
  );
}
