import { DocumentDirectoryPath } from '@dr.pogodin/react-native-fs';
import { getIcon } from '@sd/assets/util';
import { Image } from 'expo-image';
import { useEffect, useLayoutEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { View } from 'react-native';
import {
	getExplorerItemData,
	getItemLocation,
	isDarkTheme,
	ThumbKey,
	type ExplorerItem
} from '@sd/client';
import { flattenThumbnailKey, useExplorerStore } from '~/stores/explorerStore';

import { tw } from '../../lib/tailwind';

// NOTE: `file://` is required for Android to load local files!
export const getThumbnailUrlByThumbKey = (thumbKey: ThumbKey) => {
	return `file://${DocumentDirectoryPath}/thumbnails/${encodeURIComponent(
		thumbKey.base_directory_str
	)}/${encodeURIComponent(thumbKey.shard_hex)}/${encodeURIComponent(thumbKey.cas_id)}.webp`;
};

const FileThumbWrapper = ({
	children,
	size = 1,
	fixedSize = false
}: PropsWithChildren<{ size: number; fixedSize: boolean }>) => (
	<View
		style={[
			tw`items-center justify-center`,
			{ width: fixedSize ? size : 80 * size, height: fixedSize ? size : 80 * size }
		]}
	>
		{children}
	</View>
);

function useExplorerItemData(explorerItem: ExplorerItem) {
	const explorerStore = useExplorerStore();

	const firstThumbnail =
		explorerItem.type === 'Label'
			? explorerItem.thumbnails?.[0]
			: 'thumbnail' in explorerItem && explorerItem.thumbnail;

	const newThumbnail = !!(
		firstThumbnail && explorerStore.newThumbnails.has(flattenThumbnailKey(firstThumbnail))
	);

	return useMemo(() => {
		const itemData = getExplorerItemData(explorerItem);

		if (!itemData.hasLocalThumbnail) {
			itemData.hasLocalThumbnail = newThumbnail;
		}

		return itemData;
	}, [explorerItem, newThumbnail]);
}

enum ThumbType {
	Icon,
	// Original,
	Thumbnail,
	Location
}

type FileThumbProps = {
	data: ExplorerItem;
	size?: number;
	fixedSize?: boolean;
	// loadOriginal?: boolean;
};

/**
 * @param data This is the ExplorerItem object
 * @param size This is multiplier for calculating icon size
 * @param fixedSize If set to true, the icon will have fixed size
 */
export default function FileThumb({ size = 1, fixedSize = false, ...props }: FileThumbProps) {
	const itemData = useExplorerItemData(props.data);
	const locationData = getItemLocation(props.data);

	const [src, setSrc] = useState<null | string>(null);
	const [thumbType, setThumbType] = useState(ThumbType.Icon);

	useLayoutEffect(() => {
		// Reset src when item changes, to allow detection of yet not updated src
		setSrc(null);
		if (locationData) {
			setThumbType(ThumbType.Location);
		} else if (itemData.hasLocalThumbnail) {
			setThumbType(ThumbType.Thumbnail);
		} else {
			setThumbType(ThumbType.Icon);
		}
	}, [locationData, itemData]);

	// This sets the src to the thumbnail url
	useEffect(() => {
		const { casId, kind, isDir, extension, thumbnailKey } = itemData;
		switch (thumbType) {
			case ThumbType.Thumbnail:
				if (casId && thumbnailKey) {
					setSrc(getThumbnailUrlByThumbKey(thumbnailKey));
				} else {
					setThumbType(ThumbType.Icon);
				}
				break;
			case ThumbType.Location:
				setSrc(getIcon('Folder', isDarkTheme(), extension, true));
				break;
			default:
				if (isDir !== null) setSrc(getIcon(kind, isDarkTheme(), extension, isDir));
				break;
		}
	}, [itemData, thumbType]);

	return (
		<FileThumbWrapper fixedSize={fixedSize} size={size}>
			{(() => {
				if (src == null) return null;
				let source = null;
				// getIcon returns number for some magic reason
				if (typeof src === 'number') {
					source = src;
				} else {
					source = { uri: src };
				}
				return (
					<Image
						cachePolicy="memory-disk"
						source={source}
						style={{
							width: fixedSize ? size : 70 * size,
							height: fixedSize ? size : 70 * size
						}}
					/>
				);
			})()}
		</FileThumbWrapper>
	);
}
