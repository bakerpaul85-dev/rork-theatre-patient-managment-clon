import React, { useState, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  Alert,
  FlatList,
  Image,
  ActivityIndicator,
  Platform,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
  LayoutChangeEvent,
  Dimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { Camera, X, Check, Trash, FileText, MapPin, Crop, RotateCcw, ZoomIn, Wand2, ScanLine } from 'lucide-react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import { convertImagesToPDF } from '@/utils/pdfConverter';

interface ScannedPage {
  uri: string;
  timestamp: string;
  latitude?: number;
  longitude?: number;
}

interface DocumentScannerProps {
  visible: boolean;
  onClose: () => void;
  onComplete: (pdfBase64: string, pages: ScannedPage[]) => void;
}

interface Corner {
  x: number;
  y: number;
}

const CORNER_SIZE = 28;
const CORNER_HIT = 50;
const MIN_CROP_SIZE = 60;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function DocumentScanner({ visible, onClose, onComplete }: DocumentScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [pages, setPages] = useState<ScannedPage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCamera, setShowCamera] = useState(true);
  const [showCrop, setShowCrop] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [rawPhoto, setRawPhoto] = useState<{ uri: string; width: number; height: number } | null>(null);
  const [processedUri, setProcessedUri] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const [locationPermission, requestLocationPermission] = Location.useForegroundPermissions();

  const frameLayoutRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const frameContainerOffsetRef = useRef({ x: 0, y: 0 });
  const cameraOverlayRef = useRef({ width: 0, height: 0 });

  const [imageLayout, setImageLayout] = useState({ width: 0, height: 0, x: 0, y: 0 });
  const [_imageBoundsState, setImageBoundsState] = useState({ renderW: 0, renderH: 0, offsetX: 0, offsetY: 0 });
  const [corners, setCorners] = useState<{ tl: Corner; tr: Corner; bl: Corner; br: Corner }>({
    tl: { x: 0, y: 0 },
    tr: { x: 0, y: 0 },
    bl: { x: 0, y: 0 },
    br: { x: 0, y: 0 },
  });

  const cornersRef = useRef(corners);
  cornersRef.current = corners;

  const activeCornerRef = useRef<'tl' | 'tr' | 'bl' | 'br' | null>(null);
  const imageLayoutRef = useRef(imageLayout);
  imageLayoutRef.current = imageLayout;

  const getImageBounds = useCallback((containerW: number, containerH: number, imgW: number, imgH: number) => {
    const containerRatio = containerW / containerH;
    const imageRatio = imgW / imgH;
    let renderW: number, renderH: number, offsetX: number, offsetY: number;
    if (imageRatio > containerRatio) {
      renderW = containerW;
      renderH = containerW / imageRatio;
      offsetX = 0;
      offsetY = (containerH - renderH) / 2;
    } else {
      renderH = containerH;
      renderW = containerH * imageRatio;
      offsetX = (containerW - renderW) / 2;
      offsetY = 0;
    }
    return { renderW, renderH, offsetX, offsetY };
  }, []);

  const initCropCorners = useCallback((layoutWidth: number, layoutHeight: number, photo: { width: number; height: number } | null) => {
    let bounds = { renderW: layoutWidth, renderH: layoutHeight, offsetX: 0, offsetY: 0 };

    if (photo) {
      bounds = getImageBounds(layoutWidth, layoutHeight, photo.width, photo.height);
      setImageBoundsState(bounds);
      console.log('Image bounds within container:', bounds);
    }

    const padX = bounds.renderW * 0.08;
    const padY = bounds.renderH * 0.08;
    const newCorners = {
      tl: { x: bounds.offsetX + padX, y: bounds.offsetY + padY },
      tr: { x: bounds.offsetX + bounds.renderW - padX, y: bounds.offsetY + padY },
      bl: { x: bounds.offsetX + padX, y: bounds.offsetY + bounds.renderH - padY },
      br: { x: bounds.offsetX + bounds.renderW - padX, y: bounds.offsetY + bounds.renderH - padY },
    };
    setCorners(newCorners);
    cornersRef.current = newCorners;
  }, [getImageBounds]);

  const getClosestCorner = (px: number, py: number): 'tl' | 'tr' | 'bl' | 'br' | null => {
    const c = cornersRef.current;
    const dists = [
      { key: 'tl' as const, d: Math.hypot(px - c.tl.x, py - c.tl.y) },
      { key: 'tr' as const, d: Math.hypot(px - c.tr.x, py - c.tr.y) },
      { key: 'bl' as const, d: Math.hypot(px - c.bl.x, py - c.bl.y) },
      { key: 'br' as const, d: Math.hypot(px - c.br.x, py - c.br.y) },
    ];
    dists.sort((a, b) => a.d - b.d);
    return dists[0].d < CORNER_HIT * 2 ? dists[0].key : null;
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        const { locationX, locationY } = evt.nativeEvent;
        const closest = getClosestCorner(locationX, locationY);
        activeCornerRef.current = closest;
      },
      onPanResponderMove: (evt: GestureResponderEvent, _gesture: PanResponderGestureState) => {
        const corner = activeCornerRef.current;
        if (!corner) return;

        const { locationX, locationY } = evt.nativeEvent;
        const layout = imageLayoutRef.current;
        const newX = Math.max(0, Math.min(layout.width, locationX));
        const newY = Math.max(0, Math.min(layout.height, locationY));

        const updated = { ...cornersRef.current, [corner]: { x: newX, y: newY } };
        cornersRef.current = updated;
        setCorners(updated);
      },
      onPanResponderRelease: () => {
        activeCornerRef.current = null;
      },
    })
  ).current;

  const getLocation = async (): Promise<{ latitude?: number; longitude?: number }> => {
    try {
      if (Platform.OS !== 'web') {
        if (!locationPermission?.granted) {
          const result = await requestLocationPermission();
          if (result.granted) {
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            return { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
          }
        } else {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          return { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        }
      }
    } catch (locError) {
      console.error('Error getting location:', locError);
    }
    return {};
  };

  const addScannedPage = async (base64Image: string) => {
    const { latitude, longitude } = await getLocation();

    const newPage: ScannedPage = {
      uri: base64Image,
      timestamp: new Date().toISOString(),
      latitude,
      longitude,
    };

    setPages(prev => {
      const updated = [...prev, newPage];
      console.log(`Page ${updated.length} added`);
      Alert.alert(
        'Page Captured',
        `Page ${updated.length} captured and cropped. Add more pages or finish scanning.`,
        [{ text: 'OK' }]
      );
      return updated;
    });
  };

  const autoDetectAndCrop = async (photoUri: string, photoWidth: number, photoHeight: number): Promise<string> => {
    console.log('Auto-detecting document boundaries...');
    console.log('Photo dimensions:', photoWidth, 'x', photoHeight);

    const overlayW = cameraOverlayRef.current.width || SCREEN_WIDTH;
    const overlayH = cameraOverlayRef.current.height || (SCREEN_WIDTH * 1.8);
    const frameW = frameLayoutRef.current.width;
    const frameH = frameLayoutRef.current.height;
    const frameAbsX = frameContainerOffsetRef.current.x + frameLayoutRef.current.x;
    const frameAbsY = frameContainerOffsetRef.current.y + frameLayoutRef.current.y;

    console.log('Camera overlay:', overlayW, 'x', overlayH);
    console.log('Frame absolute rect:', frameAbsX, frameAbsY, frameW, frameH);
    console.log('Frame container offset:', frameContainerOffsetRef.current);
    console.log('Frame local rect:', frameLayoutRef.current);

    let cropX: number, cropY: number, cropW: number, cropH: number;

    if (frameW > 0 && frameH > 0 && overlayW > 0 && overlayH > 0) {
      const frameRelLeft = frameAbsX / overlayW;
      const frameRelTop = frameAbsY / overlayH;
      const frameRelWidth = frameW / overlayW;
      const frameRelHeight = frameH / overlayH;

      console.log('Frame relative:', { frameRelLeft, frameRelTop, frameRelWidth, frameRelHeight });

      const photoRatio = photoWidth / photoHeight;
      const screenRatio = overlayW / overlayH;

      let visibleLeft = 0;
      let visibleTop = 0;
      let visibleWidth = photoWidth;
      let visibleHeight = photoHeight;

      if (photoRatio > screenRatio) {
        visibleWidth = photoHeight * screenRatio;
        visibleLeft = (photoWidth - visibleWidth) / 2;
      } else {
        visibleHeight = photoWidth / screenRatio;
        visibleTop = (photoHeight - visibleHeight) / 2;
      }

      console.log('Visible region in photo:', { visibleLeft, visibleTop, visibleWidth, visibleHeight });

      cropX = visibleLeft + frameRelLeft * visibleWidth;
      cropY = visibleTop + frameRelTop * visibleHeight;
      cropW = frameRelWidth * visibleWidth;
      cropH = frameRelHeight * visibleHeight;
    } else {
      const targetRatio = 0.707;
      cropW = Math.round(photoWidth * 0.78);
      cropH = Math.round(cropW / targetRatio);
      if (cropH > photoHeight * 0.85) {
        cropH = Math.round(photoHeight * 0.85);
        cropW = Math.round(cropH * targetRatio);
      }
      cropX = Math.round((photoWidth - cropW) / 2);
      cropY = Math.round((photoHeight - cropH) / 2);
    }

    cropX = Math.max(0, Math.round(cropX));
    cropY = Math.max(0, Math.round(cropY));
    cropW = Math.min(photoWidth - cropX, Math.round(cropW));
    cropH = Math.min(photoHeight - cropY, Math.round(cropH));

    console.log('Auto-crop region:', { cropX, cropY, cropW, cropH });

    if (cropW < MIN_CROP_SIZE || cropH < MIN_CROP_SIZE) {
      console.warn('Crop region too small, using full image');
      const result = await ImageManipulator.manipulateAsync(
        photoUri,
        [{ resize: { width: 1800 } }],
        { compress: 0.92, format: ImageManipulator.SaveFormat.JPEG }
      );
      return result.uri;
    }

    const result = await ImageManipulator.manipulateAsync(
      photoUri,
      [
        { crop: { originX: cropX, originY: cropY, width: cropW, height: cropH } },
        { resize: { width: 1800 } },
      ],
      { compress: 0.92, format: ImageManipulator.SaveFormat.JPEG }
    );

    console.log('Auto-crop complete:', result.uri);
    return result.uri;
  };

  const handleCapturePage = async () => {
    if (!cameraRef.current) return;

    try {
      console.log('Capturing page...');
      setIsProcessing(true);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 1.0,
        base64: false,
      });

      if (!photo || !photo.uri) {
        console.error('No photo captured');
        Alert.alert('Error', 'Failed to capture photo');
        setIsProcessing(false);
        return;
      }

      const w = photo.width || 1920;
      const h = photo.height || 2560;
      console.log('Photo captured:', photo.uri, w, h);

      setRawPhoto({ uri: photo.uri, width: w, height: h });

      const croppedUri = await autoDetectAndCrop(photo.uri, w, h);
      setProcessedUri(croppedUri);
      setShowCamera(false);
      setShowPreview(true);
      setIsProcessing(false);
    } catch (error) {
      console.error('Error capturing page:', error);
      Alert.alert('Error', 'Failed to capture page. Please try again.');
      setIsProcessing(false);
    }
  };

  const handleAcceptPreview = async () => {
    if (!processedUri) return;
    setIsProcessing(true);

    try {
      const finalResult = await ImageManipulator.manipulateAsync(
        processedUri,
        [],
        { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );

      if (!finalResult.base64) {
        Alert.alert('Error', 'Failed to process image');
        setIsProcessing(false);
        return;
      }

      const base64Image = `data:image/jpeg;base64,${finalResult.base64}`;
      await addScannedPage(base64Image);

      setRawPhoto(null);
      setProcessedUri(null);
      setShowPreview(false);
      setShowCamera(true);
    } catch (error) {
      console.error('Error accepting preview:', error);
      Alert.alert('Error', 'Failed to save page. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualCrop = () => {
    setShowPreview(false);
    setShowCrop(true);
  };

  const handleRetakePhoto = () => {
    setRawPhoto(null);
    setProcessedUri(null);
    setShowCrop(false);
    setShowPreview(false);
    setShowCamera(true);
  };

  const handleImageLayout = (event: LayoutChangeEvent) => {
    const { width, height, x, y } = event.nativeEvent.layout;
    console.log('Crop image layout:', width, height);
    const layout = { width, height, x, y };
    setImageLayout(layout);
    imageLayoutRef.current = layout;
    initCropCorners(width, height, rawPhoto);
  };

  const handleConfirmCrop = async () => {
    if (!rawPhoto) return;
    setIsProcessing(true);

    try {
      const bounds = getImageBounds(imageLayout.width, imageLayout.height, rawPhoto.width, rawPhoto.height);
      console.log('Confirm crop - image bounds:', bounds);

      const scaleX = rawPhoto.width / bounds.renderW;
      const scaleY = rawPhoto.height / bounds.renderH;

      const minX = Math.min(corners.tl.x, corners.bl.x) - bounds.offsetX;
      const minY = Math.min(corners.tl.y, corners.tr.y) - bounds.offsetY;
      const maxX = Math.max(corners.tr.x, corners.br.x) - bounds.offsetX;
      const maxY = Math.max(corners.bl.y, corners.br.y) - bounds.offsetY;

      const clampedMinX = Math.max(0, minX);
      const clampedMinY = Math.max(0, minY);
      const clampedMaxX = Math.min(bounds.renderW, maxX);
      const clampedMaxY = Math.min(bounds.renderH, maxY);

      const cropX = Math.max(0, Math.round(clampedMinX * scaleX));
      const cropY = Math.max(0, Math.round(clampedMinY * scaleY));
      const cropW = Math.min(rawPhoto.width - cropX, Math.round((clampedMaxX - clampedMinX) * scaleX));
      const cropH = Math.min(rawPhoto.height - cropY, Math.round((clampedMaxY - clampedMinY) * scaleY));

      console.log('Manual crop region:', { cropX, cropY, cropW, cropH });

      const actions: ImageManipulator.Action[] = [];

      if (cropW > MIN_CROP_SIZE && cropH > MIN_CROP_SIZE) {
        actions.push({
          crop: {
            originX: cropX,
            originY: cropY,
            width: cropW,
            height: cropH,
          },
        });
      }

      actions.push({ resize: { width: 1800 } });

      const manipulatedImage = await ImageManipulator.manipulateAsync(
        rawPhoto.uri,
        actions,
        { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );

      if (!manipulatedImage.base64) {
        Alert.alert('Error', 'Failed to process image');
        setIsProcessing(false);
        return;
      }

      const base64Image = `data:image/jpeg;base64,${manipulatedImage.base64}`;
      await addScannedPage(base64Image);

      setRawPhoto(null);
      setProcessedUri(null);
      setShowCrop(false);
      setShowCamera(true);
    } catch (error) {
      console.error('Error processing crop:', error);
      Alert.alert('Error', 'Failed to crop image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeletePage = (index: number) => {
    Alert.alert(
      'Delete Page',
      `Are you sure you want to delete page ${index + 1}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setPages(prev => prev.filter((_, i) => i !== index));
          },
        },
      ]
    );
  };

  const handleFinishScanning = async () => {
    if (pages.length === 0) {
      Alert.alert('No Pages', 'Please capture at least one page before finishing.');
      return;
    }

    setIsProcessing(true);
    try {
      console.log(`Processing ${pages.length} scanned pages...`);

      let pdfBase64 = '';
      try {
        const imageUris = pages.map(page => page.uri);
        const pdfResult = await convertImagesToPDF(imageUris, 'scanned_document.pdf', true);
        pdfBase64 = pdfResult.base64;
        console.log('PDF conversion successful');
      } catch (pdfError) {
        console.warn('PDF conversion failed, sending pages as images:', pdfError);
      }

      onComplete(pdfBase64, pages);

      setPages([]);
      setShowCamera(true);
    } catch (error) {
      console.error('Error finishing scan:', error);
      Alert.alert('Error', 'Failed to process scanned pages. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (pages.length > 0 || rawPhoto) {
      Alert.alert(
        'Discard Scan?',
        'You have scanned pages that will be lost. Are you sure you want to close?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              setPages([]);
              setRawPhoto(null);
              setProcessedUri(null);
              setShowCrop(false);
              setShowPreview(false);
              setShowCamera(true);
              onClose();
            },
          },
        ]
      );
    } else {
      onClose();
    }
  };

  const handleCameraOverlayLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    cameraOverlayRef.current = { width, height };
    console.log('Camera overlay layout:', width, height);
  };

  const handleFrameLayout = (event: LayoutChangeEvent) => {
    const { x, y, width, height } = event.nativeEvent.layout;
    frameLayoutRef.current = { x, y, width, height };
    console.log('Frame layout (relative to frameContainer):', x, y, width, height);
  };

  const handleFrameContainerLayout = (event: LayoutChangeEvent) => {
    const { x, y } = event.nativeEvent.layout;
    frameContainerOffsetRef.current = { x, y };
    console.log('Frame container offset:', x, y);
  };

  if (!permission) {
    return null;
  }

  if (!permission.granted) {
    return (
      <Modal visible={visible} animationType="slide">
        <View style={styles.permissionContainer}>
          <Camera size={64} color="#0066CC" />
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text style={styles.permissionText}>
            We need camera access to scan documents
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  const renderCropOverlay = () => {
    const { tl, tr, bl, br } = corners;
    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <View
          style={[
            styles.cropDimOverlayTop,
            { height: Math.max(0, Math.min(tl.y, tr.y)) },
          ]}
        />
        <View
          style={[
            styles.cropDimOverlayBottom,
            { height: Math.max(0, imageLayout.height - Math.max(bl.y, br.y)) },
          ]}
        />
        <View
          style={[
            styles.cropDimOverlayLeft,
            {
              top: Math.min(tl.y, tr.y),
              height: Math.max(0, Math.max(bl.y, br.y) - Math.min(tl.y, tr.y)),
              width: Math.max(0, Math.min(tl.x, bl.x)),
            },
          ]}
        />
        <View
          style={[
            styles.cropDimOverlayRight,
            {
              top: Math.min(tl.y, tr.y),
              height: Math.max(0, Math.max(bl.y, br.y) - Math.min(tl.y, tr.y)),
              width: Math.max(0, imageLayout.width - Math.max(tr.x, br.x)),
              right: 0,
            },
          ]}
        />

        {(['tl', 'tr', 'bl', 'br'] as const).map((key) => {
          const corner = corners[key];
          const isActive = activeCornerRef.current === key;
          return (
            <View
              key={key}
              style={[
                styles.cornerHandle,
                {
                  left: corner.x - CORNER_SIZE / 2,
                  top: corner.y - CORNER_SIZE / 2,
                  width: CORNER_SIZE,
                  height: CORNER_SIZE,
                  borderRadius: CORNER_SIZE / 2,
                  backgroundColor: isActive ? '#00D4FF' : '#FFFFFF',
                  borderColor: isActive ? '#00D4FF' : '#0088FF',
                  transform: [{ scale: isActive ? 1.3 : 1 }],
                },
              ]}
            />
          );
        })}

        <View style={[styles.cropLine, {
          left: tl.x, top: tl.y,
          width: Math.hypot(tr.x - tl.x, tr.y - tl.y),
          transform: [{ rotate: `${Math.atan2(tr.y - tl.y, tr.x - tl.x)}rad` }],
          transformOrigin: '0% 50%',
        }]} />
        <View style={[styles.cropLine, {
          left: tr.x, top: tr.y,
          width: Math.hypot(br.x - tr.x, br.y - tr.y),
          transform: [{ rotate: `${Math.atan2(br.y - tr.y, br.x - tr.x)}rad` }],
          transformOrigin: '0% 50%',
        }]} />
        <View style={[styles.cropLine, {
          left: bl.x, top: bl.y,
          width: Math.hypot(br.x - bl.x, br.y - bl.y),
          transform: [{ rotate: `${Math.atan2(br.y - bl.y, br.x - bl.x)}rad` }],
          transformOrigin: '0% 50%',
        }]} />
        <View style={[styles.cropLine, {
          left: tl.x, top: tl.y,
          width: Math.hypot(bl.x - tl.x, bl.y - tl.y),
          transform: [{ rotate: `${Math.atan2(bl.y - tl.y, bl.x - tl.x)}rad` }],
          transformOrigin: '0% 50%',
        }]} />
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.container}>
        {showCamera && !showCrop && !showPreview && (
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing="back"
          >
            <View style={styles.cameraOverlay} onLayout={handleCameraOverlayLayout}>
              <View style={styles.topBar}>
                <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                  <X size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <View style={styles.titleRow}>
                  <ScanLine size={18} color="#00D4FF" />
                  <Text style={styles.title}>Auto Scan</Text>
                </View>
                <View style={styles.placeholder} />
              </View>

              <View style={styles.frameContainer} onLayout={handleFrameContainerLayout}>
                {isProcessing && (
                  <View style={styles.processingOverlay}>
                    <ActivityIndicator size="large" color="#00D4FF" />
                    <Text style={styles.processingText}>Detecting document...</Text>
                  </View>
                )}
                <View style={styles.frame} onLayout={handleFrameLayout}>
                  <View style={[styles.frameCorner, styles.frameCornerTL]} />
                  <View style={[styles.frameCorner, styles.frameCornerTR]} />
                  <View style={[styles.frameCorner, styles.frameCornerBL]} />
                  <View style={[styles.frameCorner, styles.frameCornerBR]} />
                  <View style={styles.frameScanLine} />
                </View>
                <Text style={styles.hint}>
                  Align document within the frame{'\n'}It will be auto-cropped on capture
                </Text>
              </View>

              <View style={styles.bottomBar}>
                <View style={styles.sideButtonPlaceholder} />

                <TouchableOpacity
                  style={[styles.captureButton, isProcessing && styles.captureButtonDisabled]}
                  onPress={handleCapturePage}
                  disabled={isProcessing}
                  testID="capture-button"
                >
                  <View style={styles.captureButtonInner}>
                    <ScanLine size={28} color="#FFFFFF" />
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.finishButton, pages.length === 0 && styles.finishButtonDisabled]}
                  onPress={() => {
                    if (pages.length === 0) {
                      setShowCamera(false);
                      setShowCrop(false);
                      setShowPreview(false);
                    } else {
                      void handleFinishScanning();
                    }
                  }}
                >
                  {pages.length === 0 ? (
                    <FileText size={24} color="#FFFFFF" />
                  ) : (
                    <Check size={24} color="#FFFFFF" />
                  )}
                  {pages.length > 0 && (
                    <Text style={styles.pageCount}>{pages.length}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </CameraView>
        )}

        {showPreview && processedUri && (
          <View style={styles.previewContainer}>
            <View style={styles.previewHeader}>
              <TouchableOpacity onPress={handleRetakePhoto} style={styles.previewHeaderBtn}>
                <RotateCcw size={18} color="#FFFFFF" />
                <Text style={styles.previewHeaderBtnText}>Retake</Text>
              </TouchableOpacity>
              <View style={styles.previewTitleRow}>
                <Wand2 size={18} color="#00D4FF" />
                <Text style={styles.previewTitle}>Auto Cropped</Text>
              </View>
              <TouchableOpacity
                onPress={handleAcceptPreview}
                style={[styles.previewHeaderBtn, styles.previewAcceptBtn]}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Check size={18} color="#FFFFFF" />
                    <Text style={styles.previewHeaderBtnText}>Accept</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.previewImageWrapper}>
              <View style={styles.previewImageShadow}>
                <Image
                  source={{ uri: processedUri }}
                  style={styles.previewImage}
                  resizeMode="contain"
                />
              </View>
            </View>

            <View style={styles.previewFooter}>
              <TouchableOpacity
                style={styles.manualCropBtn}
                onPress={handleManualCrop}
              >
                <Crop size={18} color="#FFFFFF" />
                <Text style={styles.manualCropBtnText}>Adjust Crop Manually</Text>
              </TouchableOpacity>

              <Text style={styles.previewTip}>
                Document auto-detected and cropped. Tap Accept to save or Adjust to fine-tune.
              </Text>
            </View>
          </View>
        )}

        {showCrop && rawPhoto && (
          <View style={styles.cropContainer}>
            <View style={styles.cropHeader}>
              <TouchableOpacity onPress={handleRetakePhoto} style={styles.cropHeaderBtn}>
                <RotateCcw size={20} color="#FFFFFF" />
                <Text style={styles.cropHeaderBtnText}>Retake</Text>
              </TouchableOpacity>
              <View style={styles.cropTitleRow}>
                <Crop size={18} color="#FFFFFF" />
                <Text style={styles.cropTitle}>Manual Crop</Text>
              </View>
              <TouchableOpacity
                onPress={handleConfirmCrop}
                style={[styles.cropHeaderBtn, styles.cropConfirmBtn]}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Check size={20} color="#FFFFFF" />
                    <Text style={styles.cropHeaderBtnText}>Done</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <Text style={styles.cropInstruction}>
              Drag the corner handles to fit tightly around the document
            </Text>

            <View style={styles.cropImageWrapper}>
              <View
                style={styles.cropImageContainer}
                onLayout={handleImageLayout}
                {...panResponder.panHandlers}
              >
                <Image
                  source={{ uri: rawPhoto.uri }}
                  style={styles.cropImage}
                  resizeMode="contain"
                />
                {imageLayout.width > 0 && renderCropOverlay()}
              </View>
            </View>

            <View style={styles.cropFooter}>
              <View style={styles.cropTip}>
                <ZoomIn size={14} color="#8899AA" />
                <Text style={styles.cropTipText}>
                  Drag corners to crop out the background completely
                </Text>
              </View>
            </View>
          </View>
        )}

        {!showCamera && !showCrop && !showPreview && (
          <View style={styles.pagesView}>
            <View style={styles.pagesHeader}>
              <TouchableOpacity onPress={() => setShowCamera(true)}>
                <X size={24} color="#333" />
              </TouchableOpacity>
              <Text style={styles.pagesTitle}>Scanned Pages ({pages.length})</Text>
              <TouchableOpacity
                style={styles.doneButton}
                onPress={handleFinishScanning}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color="#0066CC" />
                ) : (
                  <Text style={styles.doneButtonText}>Done</Text>
                )}
              </TouchableOpacity>
            </View>

            <FlatList
              data={pages}
              keyExtractor={(item, index) => `page-${index}`}
              renderItem={({ item, index }) => (
                <View style={styles.pageCard}>
                  <Image source={{ uri: item.uri }} style={styles.pageImage} />
                  <View style={styles.pageInfo}>
                    <Text style={styles.pageNumber}>Page {index + 1}</Text>
                    <Text style={styles.pageTimestamp}>
                      {new Date(item.timestamp).toLocaleString()}
                    </Text>
                    {item.latitude != null && item.longitude != null && (
                      <View style={styles.locationRow}>
                        <MapPin size={12} color="#28A745" />
                        <Text style={styles.locationText}>
                          {item.latitude.toFixed(6)}, {item.longitude.toFixed(6)}
                        </Text>
                      </View>
                    )}
                  </View>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeletePage(index)}
                  >
                    <Trash size={20} color="#DC3545" />
                  </TouchableOpacity>
                </View>
              )}
              contentContainerStyle={styles.pagesList}
            />

            <TouchableOpacity
              style={styles.addMoreButton}
              onPress={() => setShowCamera(true)}
            >
              <Camera size={20} color="#FFFFFF" />
              <Text style={styles.addMoreButtonText}>Add More Pages</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#F5F7FA',
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#333',
    marginTop: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: '#6C757D',
    textAlign: 'center',
    marginBottom: 32,
  },
  permissionButton: {
    backgroundColor: '#0066CC',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  cancelBtn: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#6C757D',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  placeholder: {
    width: 40,
  },
  sideButtonPlaceholder: {
    width: 60,
    height: 60,
  },
  frameContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  frame: {
    width: '100%',
    aspectRatio: 0.707,
    borderRadius: 8,
    backgroundColor: 'transparent',
    position: 'relative' as const,
    borderWidth: 2,
    borderColor: 'rgba(0, 212, 255, 0.4)',
    borderStyle: 'dashed',
  },
  frameCorner: {
    position: 'absolute' as const,
    width: 36,
    height: 36,
    borderColor: '#00D4FF',
  },
  frameCornerTL: {
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 8,
  },
  frameCornerTR: {
    top: -2,
    right: -2,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 8,
  },
  frameCornerBL: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 8,
  },
  frameCornerBR: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 8,
  },
  frameScanLine: {
    position: 'absolute' as const,
    left: 8,
    right: 8,
    top: '50%',
    height: 2,
    backgroundColor: 'rgba(0, 212, 255, 0.5)',
    borderRadius: 1,
  },
  hint: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500' as const,
    marginTop: 20,
    textAlign: 'center',
    lineHeight: 20,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 50,
  },
  pageCount: {
    position: 'absolute' as const,
    top: -5,
    right: -5,
    backgroundColor: '#0066CC',
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700' as const,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    minWidth: 24,
    textAlign: 'center',
    overflow: 'hidden',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#00D4FF',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#0088FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  finishButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#00A3A3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  finishButtonDisabled: {
    backgroundColor: '#999',
    opacity: 0.5,
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  processingOverlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 20,
    borderRadius: 8,
  },
  processingText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600' as const,
    marginTop: 12,
  },
  previewContainer: {
    flex: 1,
    backgroundColor: '#0A0E14',
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  previewHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  previewAcceptBtn: {
    backgroundColor: '#00A854',
  },
  previewHeaderBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  previewTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  previewTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  previewImageWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  previewImageShadow: {
    flex: 1,
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1A1E26',
    shadowColor: '#00D4FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewFooter: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 8,
    alignItems: 'center',
    gap: 12,
  },
  manualCropBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  manualCropBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500' as const,
  },
  previewTip: {
    color: '#667788',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
  },
  cropContainer: {
    flex: 1,
    backgroundColor: '#111318',
  },
  cropHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  cropHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  cropConfirmBtn: {
    backgroundColor: '#0088FF',
  },
  cropHeaderBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  cropTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cropTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  cropInstruction: {
    color: '#8899AA',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
  },
  cropImageWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  cropImageContainer: {
    width: '100%',
    flex: 1,
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative' as const,
  },
  cropImage: {
    width: '100%',
    height: '100%',
  },
  cropDimOverlayTop: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  cropDimOverlayBottom: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  cropDimOverlayLeft: {
    position: 'absolute' as const,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  cropDimOverlayRight: {
    position: 'absolute' as const,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  cornerHandle: {
    position: 'absolute' as const,
    borderWidth: 3,
    zIndex: 10,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  cropLine: {
    position: 'absolute' as const,
    height: 2,
    backgroundColor: '#00D4FF',
    zIndex: 5,
    opacity: 0.8,
  },
  cropFooter: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 12,
    alignItems: 'center',
  },
  cropTip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cropTipText: {
    color: '#8899AA',
    fontSize: 12,
  },
  pagesView: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  pagesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E1E4E8',
  },
  pagesTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#333',
  },
  doneButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  doneButtonText: {
    color: '#0066CC',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  pagesList: {
    padding: 16,
  },
  pageCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  pageImage: {
    width: 60,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#E1E4E8',
  },
  pageInfo: {
    flex: 1,
    marginLeft: 12,
  },
  pageNumber: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#333',
    marginBottom: 4,
  },
  pageTimestamp: {
    fontSize: 14,
    color: '#6C757D',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  locationText: {
    fontSize: 11,
    color: '#28A745',
    fontWeight: '500' as const,
  },
  deleteButton: {
    padding: 8,
  },
  addMoreButton: {
    flexDirection: 'row',
    backgroundColor: '#0066CC',
    marginHorizontal: 16,
    marginBottom: 32,
    paddingVertical: 16,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  addMoreButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
});
