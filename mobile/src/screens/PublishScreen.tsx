import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@/hooks/useTranslation';
import clsx from 'clsx';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { useApp } from '@/context/AppContext';
import { itemsService } from '@/services/items/items.service';
import { aiService } from '@/services/ai/ai.service';
import { compressImageToDataUrl } from '@/utils/imageCompressor';
import { ApiError } from '@/services/http/apiClient';

import bikeImg from '@/assets/item-bike.svg';
import alexAvatar from '@/assets/avatar-alex.svg';

type WizardStep = 1 | 2 | 3 | 4 | 5;

const STEPS_NAV = [
  { id: 1, label: 'Fotos' },
  { id: 2, label: 'Info' },
  { id: 3, label: 'Acepto' },
  { id: 4, label: 'Vista previa' },
];

const CATEGORIES = [
  'Tecnología',
  'Deportes',
  'Fotografía',
  'Videojuegos',
  'Música',
  'Hogar',
  'Otros',
];

const CONDITIONS = [
  {
    label: 'Como nuevo',
    desc: 'Sin marcas de uso, impecable',
    icon: 'auto_awesome',
  },
  {
    label: 'Excelente estado',
    desc: 'Mínimo uso, funciona perfecto',
    icon: 'verified',
  },
  {
    label: 'Buen estado',
    desc: 'Detalles estéticos normales',
    icon: 'thumb_up',
  },
  {
    label: 'Para repuesto',
    desc: 'Requiere reparación o partes',
    icon: 'build',
  },
];

const SUGGESTIONS = [
  'Cámara',
  'iPad',
  'Laptop',
  'Smartwatch',
  'Nintendo Switch',
  'Audífonos',
];

interface FormErrors {
  name?: string;
  description?: string;
  category?: string;
  condition?: string;
  estimatedValue?: string;
  location?: string;
  photos?: string;
  wantedItems?: string;
  submit?: string;
}

const mapAiCategoryToUi = (rawCategory: string): string => {
  const normalized = rawCategory.trim().toLowerCase();
  if (!normalized) return 'Otros';

  const exactMatch = CATEGORIES.find((cat) => cat.toLowerCase() === normalized);
  if (exactMatch) return exactMatch;

  if (
    normalized.includes('tecno') ||
    normalized.includes('tech') ||
    normalized.includes('electr') ||
    normalized.includes('comput') ||
    normalized.includes('audio') ||
    normalized.includes('phone') ||
    normalized.includes('celular')
  ) {
    return 'Tecnología';
  }
  if (
    normalized.includes('deport') ||
    normalized.includes('sport') ||
    normalized.includes('bici') ||
    normalized.includes('fitness')
  ) {
    return 'Deportes';
  }
  if (
    normalized.includes('foto') ||
    normalized.includes('photo') ||
    normalized.includes('cámara') ||
    normalized.includes('camara') ||
    normalized.includes('camera') ||
    normalized.includes('lente')
  ) {
    return 'Fotografía';
  }
  if (
    normalized.includes('juego') ||
    normalized.includes('game') ||
    normalized.includes('gaming') ||
    normalized.includes('consola')
  ) {
    return 'Videojuegos';
  }
  if (
    normalized.includes('músic') ||
    normalized.includes('music') ||
    normalized.includes('instrument') ||
    normalized.includes('guitar')
  ) {
    return 'Música';
  }
  if (
    normalized.includes('hogar') ||
    normalized.includes('home') ||
    normalized.includes('casa') ||
    normalized.includes('mueble')
  ) {
    return 'Hogar';
  }
  return 'Otros';
};

const mapAiConditionToUi = (rawCondition: string): string => {
  const upper = rawCondition.trim().toUpperCase();
  if (upper === 'LIKE_NEW' || upper === 'NEW' || upper === 'COMO NUEVO') {
    return 'Como nuevo';
  }
  if (
    upper === 'EXCELLENT' ||
    upper === 'EXCELENTE' ||
    upper === 'EXCELENTE ESTADO'
  ) {
    return 'Excelente estado';
  }
  if (
    upper === 'GOOD' ||
    upper === 'FAIR' ||
    upper === 'BUENO' ||
    upper === 'BUEN ESTADO'
  ) {
    return 'Buen estado';
  }
  if (
    upper === 'FOR_PARTS' ||
    upper === 'POOR' ||
    upper === 'PARA PIEZAS' ||
    upper === 'PARA REPUESTO'
  ) {
    return 'Para repuesto';
  }
  return 'Excelente estado';
};

export const mergeUniqueWants = (
  existingWants: string[],
  suggestedWants: string[],
): string[] => {
  const seen = new Set(existingWants.map((w) => w.trim().toLowerCase()));
  const merged = [...existingWants];

  for (const rawSuggestion of suggestedWants) {
    const trimmed = rawSuggestion.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(trimmed);
    }
  }

  return merged.slice(0, 10);
};

export const PublishScreen: React.FC = () => {
  const navigate = useNavigate();
  const { t, language: locale } = useTranslation();
  const { currentUser, createItemReal } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);


  // Wizard step state (1 to 5)
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);

  // Step 1: Photos state
  const [photos, setPhotos] = useState<string[]>([bikeImg]);
  const [isCompressingPhoto, setIsCompressingPhoto] = useState(false);

  // Step 2: Information state
  const [name, setName] = useState('Bicicleta Trek Marlin 7');
  const [description, setDescription] = useState(
    'Rodado 29" • Talle M • Frenos hidráulicos Shimano. Revisión reciente.',
  );
  const [category, setCategory] = useState('Deportes');
  const [condition, setCondition] = useState('Excelente estado');
  const [estimatedValue, setEstimatedValue] = useState('780');
  const [location, setLocation] = useState(currentUser?.location || t('publish.defaultLocation'));

  // Step 3: Wanted items state
  const [wantedItems, setWantedItems] = useState<string[]>(['Cámara', 'iPad']);
  const [searchQuery, setSearchQuery] = useState('');

  // AI Assistant state
  const [isAnalyzingAi, setIsAnalyzingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiValueRange, setAiValueRange] = useState<{
    min: number;
    max: number;
    reasoning?: string;
  } | null>(null);
  const [aiTags, setAiTags] = useState<string[]>([]);

  // Step 4: Publishing loader state
  const [isPublishing, setIsPublishing] = useState(false);

  // Step 5: Success animation state
  const [animateCheck, setAnimateCheck] = useState(false);

  // Form errors
  const [errors, setErrors] = useState<FormErrors>({});

  // Enable AI button as soon as the user selects a photo OR types at least 3 chars in title
  const canAutocompleteWithAi =
    photos.length > 0 || name.trim().length >= 3;

  // Animate success checkmark when entering Step 5
  useEffect(() => {
    if (currentStep === 5) {
      const timer = requestAnimationFrame(() => {
        setAnimateCheck(true);
      });
      return () => cancelAnimationFrame(timer);
    } else {
      setAnimateCheck(false);
    }
  }, [currentStep]);

  // Real AI Vision & Valuation Assistant handler
  const handleAiAutocomplete = async () => {
    if (!canAutocompleteWithAi || isAnalyzingAi) return;

    setIsAnalyzingAi(true);
    setAiError(null);

    try {
      const primaryPhoto = photos[0];
      const imageBase64 =
        primaryPhoto && primaryPhoto.startsWith('data:image/')
          ? primaryPhoto
          : undefined;
      const hintText = name.trim().length >= 3 ? name.trim() : undefined;

      const analysis = await aiService.analyzeItemPhoto({
        imageBase64,
        hintText,
        locale,
      });

      const resolvedName = analysis.name || name.trim();
      const resolvedCategory = mapAiCategoryToUi(analysis.category);
      const resolvedCondition = mapAiConditionToUi(analysis.condition);
      const resolvedDescription = analysis.description || description.trim();

      if (resolvedName) {
        setName(resolvedName);
      }
      setCategory(resolvedCategory);
      setCondition(resolvedCondition);
      if (resolvedDescription) {
        setDescription(resolvedDescription);
      }
      if (analysis.estimatedValue > 0) {
        setEstimatedValue(String(analysis.estimatedValue));
      }

      let minVal = analysis.minValue;
      let maxVal = analysis.maxValue;
      let reasoning: string | undefined;

      // Optionally refine value range via /ai/estimate-value if name & category are available
      if (resolvedName && resolvedCategory) {
        try {
          const valuation = await aiService.estimateItemValue({
            name: resolvedName,
            category: resolvedCategory,
            condition: resolvedCondition,
            description: resolvedDescription,
          });
          if (valuation.estimatedValue > 0 && !analysis.estimatedValue) {
            setEstimatedValue(String(valuation.estimatedValue));
          }
          if (valuation.minValue > 0 && valuation.maxValue > 0) {
            minVal = valuation.minValue;
            maxVal = valuation.maxValue;
          }
          reasoning = valuation.reasoning;
        } catch {
          // Keep range from analyzeItemPhoto if secondary valuation endpoint fails
        }
      }

      setAiValueRange({
        min: minVal,
        max: maxVal,
        reasoning,
      });

      if (analysis.aiTags.length > 0) {
        setAiTags(analysis.aiTags);
      }

      if (analysis.suggestedWants.length > 0) {
        setWantedItems((prev) =>
          mergeUniqueWants(prev, analysis.suggestedWants),
        );
      }

      setErrors({});

      if (currentStep === 1) {
        setCurrentStep(2);
      }
    } catch (err) {
      const fallbackMsg = t('publish.ai.failed');

      if (err instanceof ApiError && err.message) {
        setAiError(`${fallbackMsg} (${err.message})`);
      } else {
        setAiError(fallbackMsg);
      }
    } finally {
      setIsAnalyzingAi(false);
    }
  };

  // Real Photo selection & HTML5 Canvas compression (1024px max, JPEG 0.82)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsCompressingPhoto(true);
    setErrors((prev) => ({ ...prev, photos: undefined }));

    try {
      const compressedUrls: string[] = [];
      const availableSlots = Math.max(
        0,
        4 - (photos.length === 1 && photos[0] === bikeImg ? 0 : photos.length),
      );

      for (let i = 0; i < files.length && compressedUrls.length < availableSlots; i++) {
        const compressedDataUrl = await compressImageToDataUrl(files[i], {
          maxDimension: 1024,
          quality: 0.82,
          mimeType: 'image/jpeg',
        });
        compressedUrls.push(compressedDataUrl);
      }

      if (compressedUrls.length > 0) {
        setPhotos((prev) => {
          // Replace the default SVG placeholder if user uploads their first real photo
          const baseList = prev.length === 1 && prev[0] === bikeImg ? [] : prev;
          return [...baseList, ...compressedUrls].slice(0, 4);
        });
      }
    } catch {
      setErrors((prev) => ({
        ...prev,
        photos: t('publish.errors.photoProcessing'),
      }));
    } finally {
      setIsCompressingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemovePhoto = (indexToRemove: number) => {
    setPhotos((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Step Navigation Backwards
  const handlePrevStep = () => {
    if (currentStep > 1 && currentStep <= 4) {
      setErrors((prev) => ({ ...prev, submit: undefined }));
      setCurrentStep((prev) => (prev - 1) as WizardStep);
    }
  };

  // Step 1 Validation & Next
  const handleNextStep1 = () => {
    if (photos.length === 0) {
      setErrors((prev) => ({
        ...prev,
        photos: t('publish.errors.photoRequired'),
      }));
      return;
    }
    setErrors((prev) => ({ ...prev, photos: undefined }));
    setCurrentStep(2);
  };

  // Step 2 Validation & Next
  const handleNextStep2 = () => {
    const nextErrors: FormErrors = {};

    if (!name.trim()) {
      nextErrors.name = t('publish.errors.nameRequired');
    }
    if (!description.trim()) {
      nextErrors.description = t('publish.errors.descriptionRequired');
    }
    if (!category.trim()) {
      nextErrors.category = t('publish.errors.categoryRequired');
    }
    if (!condition.trim()) {
      nextErrors.condition = t('publish.errors.conditionRequired');
    }
    const parsedVal = Number(estimatedValue);
    if (!estimatedValue || isNaN(parsedVal) || parsedVal <= 0) {
      nextErrors.estimatedValue = t('publish.errors.valueInvalid');
    }
    if (!location.trim()) {
      nextErrors.location = t('publish.errors.locationRequired');
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors((prev) => ({ ...prev, ...nextErrors }));
      return;
    }

    setErrors({});
    setCurrentStep(3);
  };

  // Step 3 Actions & Next
  const handleAddWantedItem = (itemToAdd: string) => {
    const trimmed = itemToAdd.trim();
    if (!trimmed) return;
    setWantedItems((prev) => mergeUniqueWants(prev, [trimmed]));
    if (errors.wantedItems) {
      setErrors((prev) => ({ ...prev, wantedItems: undefined }));
    }
    setSearchQuery('');
  };

  const handleRemoveWantedItem = (itemToRemove: string) => {
    setWantedItems((prev) => prev.filter((item) => item !== itemToRemove));
  };

  const handleToggleSuggestion = (item: string) => {
    if (wantedItems.includes(item)) {
      handleRemoveWantedItem(item);
    } else {
      handleAddWantedItem(item);
    }
  };

  const handleNextStep3 = () => {
    if (wantedItems.length === 0) {
      setErrors((prev) => ({
        ...prev,
        wantedItems: t('publish.errors.wantedRequired'),
      }));
      return;
    }
    setErrors((prev) => ({ ...prev, wantedItems: undefined }));
    setCurrentStep(4);
  };

  // Step 4 Real Publish Action -> POST /api/v1/items
  const handlePublish = async () => {
    if (isPublishing) return;

    setIsPublishing(true);
    setErrors((prev) => ({ ...prev, submit: undefined }));

    try {
      // Upload base64 data URLs if upload-image endpoint is available, or pass directly
      const uploadedImages: string[] = [];
      for (const photo of photos) {
        if (photo.startsWith('data:image/')) {
          const uploadedUrl = await itemsService.uploadImage(photo);
          uploadedImages.push(uploadedUrl);
        } else {
          uploadedImages.push(photo);
        }
      }

      const primaryImage = uploadedImages[0] || bikeImg;

      await createItemReal({
        name: name.trim(),
        category,
        condition,
        description: description.trim(),
        estimatedValue: Number(estimatedValue) || 100,
        location: location.trim(),
        imageUrl: primaryImage,
        images: uploadedImages.length > 0 ? uploadedImages : [primaryImage],
        wants: wantedItems,
      });

      setCurrentStep(5);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.statusCode === 401) {
          setErrors((prev) => ({
            ...prev,
            submit: t('publish.errors.loginRequired'),
          }));
        } else {
          setErrors((prev) => ({
            ...prev,
            submit: err.message || t('publish.errors.publishFailed'),
          }));
        }
      } else if (err instanceof Error) {
        setErrors((prev) => ({
          ...prev,
          submit: err.message,
        }));
      } else {
        setErrors((prev) => ({
          ...prev,
          submit: t('publish.errors.publishUnexpected'),
        }));
      }
    } finally {
      setIsPublishing(false);
    }
  };

  // Display cover photo
  const coverPhoto = photos[0] || bikeImg;
  const ownerName = currentUser?.name || 'Alex Morales';
  const ownerAvatar = currentUser?.avatarUrl || alexAvatar;
  const ownerRating = (currentUser?.rating ?? 4.9).toFixed(1);

  const renderAiAssistantBanner = () => (
    <div className="rounded-2xl border border-primary/30 bg-primary/5 dark:bg-primary/10 p-3.5 space-y-2.5 transition-all">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-primary text-on-primary flex items-center justify-center shrink-0 shadow-xs">
            <Icon
              name={isAnalyzingAi ? 'progress_activity' : 'auto_awesome'}
              size="sm"
              className={isAnalyzingAi ? 'animate-spin' : undefined}
              filled
            />
          </div>
          <div className="min-w-0">
            <p className="font-label-md text-label-md font-bold text-on-surface truncate">
              {t('publish.ai.assistant')}
            </p>
            <p className="font-body-sm text-body-sm text-on-surface-variant truncate">
              {isAnalyzingAi
                ? t('publish.ai.analyzing')
                : t('publish.ai.hint')}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleAiAutocomplete}
          disabled={!canAutocompleteWithAi || isAnalyzingAi}
          data-testid="ai-autocomplete-btn"
          className={clsx(
            'shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-label-md text-label-md font-bold transition-all shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            canAutocompleteWithAi && !isAnalyzingAi
              ? 'bg-primary text-on-primary hover:opacity-95 active:scale-95 cursor-pointer'
              : 'bg-surface-container-high text-on-surface-variant/60 cursor-not-allowed',
          )}
        >
          <span>
            {isAnalyzingAi ? t('publish.ai.analyzing') : t('publish.ai.button')}
          </span>
        </button>
      </div>

      {aiError && (
        <div
          role="alert"
          data-testid="ai-error-banner"
          className="p-2.5 rounded-xl bg-error-container/25 border border-error/40 text-error flex items-start gap-2 font-body-sm text-body-sm"
        >
          <Icon name="info" size="xs" className="shrink-0 mt-0.5" />
          <span>{aiError}</span>
        </div>
      )}

      {(aiValueRange || aiTags.length > 0) && (
        <div className="pt-1 flex flex-col gap-2 border-t border-primary/15">
          {aiValueRange && (
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span
                data-testid="ai-value-range-badge"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/15 text-primary font-label-sm text-label-sm font-bold"
              >
                <Icon name="payments" size="xs" />
                <span>
                  Rango sugerido IA: ${aiValueRange.min} - ${aiValueRange.max} USD
                </span>
              </span>
              {aiValueRange.reasoning && (
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  {aiValueRange.reasoning}
                </span>
              )}
            </div>
          )}

          {aiTags.length > 0 && (
            <div
              data-testid="ai-tags-list"
              className="flex items-center flex-wrap gap-1.5"
            >
              <span className="font-label-sm text-label-sm text-on-surface-variant font-semibold mr-1">
                {t('publish.ai.tags')}
              </span>
              {aiTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2 py-0.5 rounded-md bg-surface-container-highest text-on-surface-variant font-label-sm text-label-sm"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );

  // STEP 5: Success Screen (Not counted in step indicator)
  if (currentStep === 5) {
    return (
      <div className="flex flex-col items-center justify-between min-h-full px-margin pt-8 pb-8 text-center space-y-6">
        {/* Animated Celebration & Header */}
        <div className="flex flex-col items-center space-y-4 w-full">
          <div
            className={clsx(
              'w-24 h-24 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-lg ring-8 ring-primary-fixed/50 transition-all duration-500 ease-out',
              animateCheck ? 'scale-100 opacity-100' : 'scale-50 opacity-0',
            )}
          >
            <Icon name="check_circle" size="xl" filled />
          </div>

          <div className="space-y-1.5 max-w-xs">
            <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface">
              {t('publish.success.title')}
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant">
              {t('publish.success.description', { name })}
            </p>
          </div>
        </div>

        {/* Success Item Summary Card */}
        <section
          aria-label={t('publish.success.summaryAria')}
          className="w-full rounded-2xl border border-surface-container-high/60 shadow-sm bg-surface-container-lowest p-4 text-left flex items-center gap-3.5"
        >
          <div className="relative w-16 h-16 rounded-xl bg-surface-container-high overflow-hidden shrink-0">
            <img src={coverPhoto} alt={name} className="w-full h-full object-cover" />
          </div>

          <div className="flex flex-col flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1 mb-1">
              <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface truncate">
                {name}
              </h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-label-sm text-label-sm font-bold bg-[#1a7a4a]/10 text-[#1a7a4a] shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1a7a4a]" />
                {t('publish.success.active')}
              </span>
            </div>

            <div className="flex items-center gap-1.5 font-body-sm text-body-sm text-on-surface-variant">
              <span>{t(`catalog.categories.${category}`, { defaultValue: category })}</span>
              <span>•</span>
              <span className="font-semibold text-on-surface">${estimatedValue} USD</span>
            </div>

            <span className="font-label-sm text-label-sm text-primary font-bold mt-1 flex items-center gap-1">
              <Icon name="sync_alt" size="xs" />
              {t('publish.success.readyForRoutes')}
            </span>
          </div>
        </section>

        {/* Action Buttons */}
        <div className="w-full flex flex-col gap-3 pt-2">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            leftIcon="sync_alt"
            onClick={() => navigate('/swap/configure')}
          >
            {t('publish.success.findSwap')}
          </Button>

          <Button
            variant="outline"
            size="lg"
            fullWidth
            leftIcon="person"
            onClick={() => navigate('/profile')}
          >
            {t('publish.success.viewProfile')}
          </Button>

          <button
            type="button"
            onClick={() => navigate('/home')}
            className="font-label-md text-label-md text-on-surface-variant hover:text-primary py-2 transition-colors select-none text-center focus-visible:outline-none focus-visible:underline"
          >
            {t('publish.success.backHome')}
          </button>
        </div>
      </div>
    );
  }

  // STEPS 1 - 4 WIZARD VIEW
  return (
    <div className="flex flex-col min-h-full px-margin pt-4 pb-28">
      {/* Hidden file input for camera / gallery selection */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        capture="environment"
        multiple
        onChange={handleFileChange}
        className="hidden"
        aria-label={t('publish.selectPhoto')}
      />

      {/* Top Step Navigation Header */}
      <div className="w-full mb-6">
        {/* Subtle Back link (Steps 2, 3, 4) */}
        {currentStep > 1 && (
          <button
            type="button"
            onClick={handlePrevStep}
            className="inline-flex items-center gap-1 font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors mb-3 select-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded"
          >
            <Icon name="arrow_back" size="xs" />
            <span>{t('publish.previousStep')}</span>
          </button>
        )}

        {/* 4-Step Indicator Dots & Connectors */}
        <div className="flex items-center justify-between w-full relative">
          {STEPS_NAV.map((step, idx) => {
            const isCompleted = currentStep > step.id;
            const isActive = currentStep === step.id;
            const isUpcoming = currentStep < step.id;

            return (
              <React.Fragment key={step.id}>
                {idx > 0 && (
                  <div
                    className={clsx(
                      'h-0.5 flex-1 mx-1.5 transition-colors duration-150',
                      currentStep > step.id - 1 ? 'bg-primary' : 'bg-surface-container-high',
                    )}
                  />
                )}

                <button
                  type="button"
                  disabled={isUpcoming}
                  onClick={() => {
                    if (isCompleted) {
                      setCurrentStep(step.id as WizardStep);
                    }
                  }}
                  className={clsx(
                    'flex flex-col items-center gap-1 select-none focus-visible:outline-none',
                    isCompleted && 'cursor-pointer',
                    !isCompleted && 'cursor-default',
                  )}
                >
                  <div
                    className={clsx(
                      'w-7 h-7 rounded-full flex items-center justify-center font-bold font-label-sm text-label-sm transition-all duration-150',
                      isActive && 'bg-primary text-on-primary ring-4 ring-primary/20',
                      isCompleted && 'bg-primary text-on-primary',
                      isUpcoming &&
                        'border-2 border-outline/40 bg-surface-container-lowest text-outline',
                    )}
                  >
                    {isCompleted ? (
                      <Icon name="check" size="xs" />
                    ) : (
                      <span>{step.id}</span>
                    )}
                  </div>
                  <span
                    className={clsx(
                      'font-label-sm text-label-sm transition-colors',
                      isActive && 'text-primary font-bold',
                      isCompleted && 'text-on-surface font-semibold',
                      isUpcoming && 'text-on-surface-variant/70 font-medium',
                    )}
                  >
                    {t(`publish.steps.${step.id}`, { defaultValue: step.label })}
                  </span>
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* ================= STEP 1: FOTOS ================= */}
      {currentStep === 1 && (
        <div className="flex flex-col space-y-6">
          <div className="space-y-1">
            <h1 className="font-headline-md text-headline-md font-bold text-on-surface">
              {t('publish.photos.title')}
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant">
              {t('publish.photos.subtitle')}
            </p>
          </div>

          {/* Large Dashed Upload Zone */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            className="w-full h-48 rounded-2xl border-dashed border-2 border-primary/40 bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer flex flex-col items-center justify-center gap-3 p-4 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <div className="w-14 h-14 rounded-full bg-primary-fixed text-primary flex items-center justify-center shadow-xs">
              <Icon
                name={isCompressingPhoto ? 'progress_activity' : 'add_a_photo'}
                size="xl"
                className={isCompressingPhoto ? 'animate-spin' : undefined}
              />
            </div>
            <div className="text-center">
              <span className="font-label-lg text-label-lg font-bold text-primary block">
                {isCompressingPhoto ? t('publish.photos.optimizing') : t('publish.photos.tapToAdd')}
              </span>
              <span className="font-body-sm text-body-sm text-on-surface-variant mt-0.5 block">
                {t('publish.photos.limits')}
              </span>
            </div>
          </div>

          {/* 4 Thumbnail Slots */}
          <div className="space-y-2">
            <span className="font-label-md text-label-md text-on-surface font-semibold">
              Fotos seleccionadas ({photos.length}/4)
            </span>

            <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
              {[0, 1, 2, 3].map((index) => {
                const photo = photos[index];

                if (photo) {
                  return (
                    <div
                      key={index}
                      className="relative w-20 h-20 rounded-xl overflow-hidden border border-surface-container-high/60 bg-surface-container-low shadow-xs shrink-0 group"
                    >
                      <img
                        src={photo}
                        alt={t('publish.photos.alt', { index: index + 1 })}
                        className="w-full h-full object-cover"
                      />
                      {index === 0 && (
                        <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded-md bg-surface/90 backdrop-blur-xs font-label-sm text-[9px] font-bold text-primary shadow-xs">
                          {t('publish.photos.cover')}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemovePhoto(index);
                        }}
                        aria-label={`Eliminar foto ${index + 1}`}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-surface-container-lowest/90 text-on-surface hover:bg-error hover:text-on-error flex items-center justify-center shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <Icon name="close" size="xs" />
                      </button>
                    </div>
                  );
                }

                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    aria-label={`Agregar foto slot ${index + 1}`}
                    className="w-20 h-20 rounded-xl border-dashed border-2 border-surface-container-high/80 bg-surface-container-low hover:border-primary/50 hover:bg-surface-container transition-all flex flex-col items-center justify-center text-outline group shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <Icon
                      name="add"
                      size="sm"
                      className="group-hover:text-primary transition-colors"
                    />
                    <span className="font-label-sm text-label-sm text-on-surface-variant/70 mt-0.5">
                      {index + 1}
                    </span>
                  </button>
                );
              })}
            </div>

            {errors.photos && (
              <p className="font-body-sm text-body-sm text-error mt-1">{errors.photos}</p>
            )}
          </div>

          {/* AI Autocomplete Assistant Banner in Step 1 */}
          {renderAiAssistantBanner()}
        </div>
      )}

      {/* ================= STEP 2: INFORMACIÓN ================= */}
      {currentStep === 2 && (
        <div className="flex flex-col space-y-5">
          <div className="space-y-1">
            <h1 className="font-headline-md text-headline-md font-bold text-on-surface">
              {t('publish.info.title')}
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant">
              {t('publish.info.subtitle')}
            </p>
          </div>

          {/* AI Autocomplete Assistant Banner in Step 2 */}
          {renderAiAssistantBanner()}

          {/* Nombre del artículo */}
          <Input
            label={t('publish.info.name')}
            required
            placeholder={t('publish.info.namePlaceholder')}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
            }}
            error={errors.name}
          />

          {/* Descripción */}
          <div className="flex flex-col gap-1.5 w-full">
            <div className="flex items-center justify-between">
              <label htmlFor="description" className="font-label-md text-label-md text-on-surface">
                {t('publish.info.description')}
              </label>
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                {description.length} caracteres
              </span>
            </div>
            <textarea
              id="description"
              rows={3}
              placeholder={t('publish.info.descriptionPlaceholder')}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (errors.description) {
                  setErrors((prev) => ({ ...prev, description: undefined }));
                }
              }}
              className={clsx(
                'w-full p-3.5 bg-surface-container-low text-on-surface rounded-2xl font-body-md text-body-md resize-none',
                'placeholder:text-on-surface-variant/70 transition-all duration-150',
                'focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30',
                errors.description && 'ring-2 ring-error/50 bg-error-container/20',
              )}
            />
            {errors.description && (
              <span className="font-body-sm text-body-sm text-error">{errors.description}</span>
            )}
          </div>

          {/* Categoría Selector Chips */}
          <div className="flex flex-col gap-2 w-full">
            <label className="font-label-md text-label-md text-on-surface">{t('publish.info.category')}</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <Chip
                  key={cat}
                  active={category === cat}
                  onClick={() => {
                    setCategory(cat);
                    if (errors.category) setErrors((prev) => ({ ...prev, category: undefined }));
                  }}
                >
                  {t(`catalog.categories.${cat}`, { defaultValue: cat })}
                </Chip>
              ))}
            </div>
            {errors.category && (
              <span className="font-body-sm text-body-sm text-error">{errors.category}</span>
            )}
          </div>

          {/* Estado Radio-style Cards */}
          <div className="flex flex-col gap-2 w-full">
            <label className="font-label-md text-label-md text-on-surface">
              {t('publish.info.condition')}
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {CONDITIONS.map((cond) => {
                const isSelected = condition === cond.label;
                return (
                  <button
                    key={cond.label}
                    type="button"
                    onClick={() => {
                      setCondition(cond.label);
                      if (errors.condition) {
                        setErrors((prev) => ({ ...prev, condition: undefined }));
                      }
                    }}
                    className={clsx(
                      'flex flex-col items-start p-3 rounded-xl border text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                      isSelected
                        ? 'border-primary bg-primary/5 shadow-xs'
                        : 'border-surface-container-high/60 bg-surface-container-lowest hover:bg-surface-container-low',
                    )}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <Icon
                        name={cond.icon}
                        size="sm"
                        className={isSelected ? 'text-primary' : 'text-on-surface-variant'}
                        filled={isSelected}
                      />
                      <div
                        className={clsx(
                          'w-4 h-4 rounded-full border flex items-center justify-center transition-colors',
                          isSelected ? 'border-primary bg-primary' : 'border-outline/50',
                        )}
                      >
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-on-primary" />}
                      </div>
                    </div>
                    <span
                      className={clsx(
                        'font-label-md text-label-md',
                        isSelected ? 'text-primary font-bold' : 'text-on-surface font-semibold',
                      )}
                    >
                      {t(`catalog.conditions.${cond.label}`, { defaultValue: cond.label })}
                    </span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant leading-tight mt-0.5">
                      {t(`publish.conditionDescriptions.${cond.label}`, { defaultValue: cond.desc })}
                    </span>
                  </button>
                );
              })}
            </div>
            {errors.condition && (
              <span className="font-body-sm text-body-sm text-error">{errors.condition}</span>
            )}
          </div>

          {/* Valor Estimado ($ USD) */}
          <div className="flex flex-col gap-1.5 w-full">
            <div className="flex items-center justify-between">
              <label
                htmlFor="estimated-value-input"
                className="font-label-md text-label-md text-on-surface"
              >
                {t('publish.info.estimatedValue')}
              </label>
              {aiValueRange ? (
                <span className="font-label-sm text-label-sm text-primary font-bold">
                  Rango sugerido IA: ${aiValueRange.min} - ${aiValueRange.max} USD
                </span>
              ) : (
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  {t('publish.info.reference')}
                </span>
              )}
            </div>
            <div
              className={clsx(
                'relative flex items-center w-full h-[52px] bg-surface-container-low rounded-2xl px-4 transition-all duration-150',
                'focus-within:bg-surface-container-lowest focus-within:ring-2 focus-within:ring-primary/30',
                errors.estimatedValue && 'ring-2 ring-error/50 bg-error-container/20',
              )}
            >
              <span className="font-headline-sm text-headline-sm font-bold text-on-surface-variant mr-2 select-none">
                $
              </span>
              <input
                id="estimated-value-input"
                type="number"
                min="1"
                step="10"
                value={estimatedValue}
                onChange={(e) => {
                  setEstimatedValue(e.target.value);
                  if (errors.estimatedValue) {
                    setErrors((prev) => ({ ...prev, estimatedValue: undefined }));
                  }
                }}
                placeholder="780"
                className="w-full bg-transparent text-on-surface font-body-md text-body-md focus:outline-none"
              />
              <span className="font-label-md text-label-md font-bold text-on-surface-variant ml-2 select-none">
                USD
              </span>
            </div>
            {errors.estimatedValue && (
              <span className="font-body-sm text-body-sm text-error">{errors.estimatedValue}</span>
            )}
          </div>

          {/* Ubicación */}
          <Input
            label={t('publish.info.location')}
            leftIcon="location_on"
            placeholder={t('publish.info.locationPlaceholder')}
            value={location}
            onChange={(e) => {
              setLocation(e.target.value);
              if (errors.location) setErrors((prev) => ({ ...prev, location: undefined }));
            }}
            error={errors.location}
            helperText={t('publish.info.locationHelper')}
          />
        </div>
      )}

      {/* ================= STEP 3: ¿QUÉ ACEPTARÍAS? ================= */}
      {currentStep === 3 && (
        <div className="flex flex-col space-y-6">
          <div className="space-y-1">
            <h1 className="font-headline-md text-headline-md font-bold text-on-surface">
              {t('publish.wants.title')}
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant">
              {t('publish.wants.subtitle')}
            </p>
          </div>

          {/* Search / Add Input */}
          <div className="flex gap-2 items-center">
            <div className="flex-1">
              <Input
                placeholder={t('publish.wants.searchPlaceholder')}
                leftIcon="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddWantedItem(searchQuery);
                  }
                }}
              />
            </div>
            <Button
              variant="secondary"
              size="md"
              onClick={() => handleAddWantedItem(searchQuery)}
              disabled={!searchQuery.trim()}
              className="shrink-0"
            >
              {t('publish.wants.add')}
            </Button>
          </div>

          {/* Suggestion Chips */}
          <div className="space-y-2">
            <span className="font-label-md text-label-md font-semibold text-on-surface">
              {t('publish.wants.popular')}
            </span>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((item) => {
                const isAdded = wantedItems.includes(item);
                return (
                  <Chip
                    key={item}
                    active={isAdded}
                    icon={isAdded ? 'check' : 'add'}
                    onClick={() => handleToggleSuggestion(item)}
                  >
                    {item}
                  </Chip>
                );
              })}
            </div>
          </div>

          {/* Added Items List (Removable Chips with ×) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-label-md text-label-md font-semibold text-on-surface">
                {t('publish.wants.accepted', { count: wantedItems.length })}
              </span>
              {wantedItems.length > 0 && (
                <span className="font-label-sm text-label-sm text-primary font-bold">
                  {wantedItems.length >= 2 ? t('publish.wants.optimalVariety') : t('publish.wants.minimumOne')}
                </span>
              )}
            </div>

            {wantedItems.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-error/50 bg-error-container/20 text-center">
                <p className="font-body-sm text-body-sm text-error">
                  {t('publish.errors.wantedRequired')}
                </p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 p-3 rounded-2xl bg-surface-container-low border border-surface-container-high/60 min-h-[56px] items-center">
                {wantedItems.map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-1.5 h-9 pl-3.5 pr-1.5 rounded-full bg-primary-container text-on-primary-container font-label-md text-label-md shadow-xs font-bold"
                  >
                    <span>{item}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveWantedItem(item)}
                      aria-label={`Eliminar ${item}`}
                      className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-black/10 active:scale-90 transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-on-primary-container"
                    >
                      <Icon name="close" size="xs" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {errors.wantedItems && (
              <span className="font-body-sm text-body-sm text-error">{errors.wantedItems}</span>
            )}
          </div>

          {/* Info Banner */}
          <div className="p-4 rounded-2xl border border-surface-container-high/60 bg-surface-container-low flex items-start gap-3 shadow-sm">
            <div className="w-9 h-9 rounded-full bg-primary-fixed text-primary flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
              <Icon name="tips_and_updates" size="sm" />
            </div>
            <div className="flex flex-col">
              <span className="font-label-md text-label-md font-bold text-on-surface">
                {t('publish.wants.discoverMore')}
              </span>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                {t('publish.wants.moreRoutes')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ================= STEP 4: VISTA PREVIA ================= */}
      {currentStep === 4 && (
        <div className="flex flex-col space-y-5">
          <div className="space-y-1">
            <h1 className="font-headline-md text-headline-md font-bold text-on-surface">
              {t('publish.preview.title')}
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant">
              {t('publish.preview.subtitle')}
            </p>
          </div>

          {errors.submit && (
            <div
              role="alert"
              className="p-3.5 rounded-2xl bg-error-container/25 border border-error/40 text-error flex items-start gap-2.5"
            >
              <Icon name="error" size="sm" className="shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-label-md text-label-md font-bold">{errors.submit}</p>
              </div>
            </div>
          )}

          {/* Large ObjectCard Preview */}
          <article className="flex flex-col rounded-2xl bg-surface-container-lowest p-4 shadow-sm space-y-4 border border-surface-container-high/60">
            {/* Large Image (h-56 full width rounded-2xl) */}
            <div className="relative w-full h-56 rounded-2xl bg-surface-container-high overflow-hidden shadow-xs">
              <img
                src={coverPhoto}
                alt={name}
                className="w-full h-full object-cover"
              />
              <span className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-surface/90 backdrop-blur-sm font-label-sm text-label-sm text-primary font-bold shadow-xs">
                {t(`catalog.categories.${category}`, { defaultValue: category })}
              </span>
            </div>

            {/* Title & Badges */}
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-headline-md text-headline-md font-bold text-on-surface">
                  {name}
                </h2>
                <Badge variant="surface" className="shrink-0">
                  {t(`catalog.conditions.${condition}`, { defaultValue: condition })}
                </Badge>
              </div>

              {/* Estimated Value & Location */}
              <div className="flex items-center justify-between py-2 border-y border-surface-container-high/60">
                <div className="flex flex-col">
                  <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">
                    {t('publish.info.estimatedValue')}
                  </span>
                  <span className="font-headline-sm text-headline-sm font-bold text-primary">
                    ${estimatedValue}{' '}
                    <span className="font-label-sm text-label-sm text-on-surface-variant">USD</span>
                  </span>
                </div>

                <div className="flex items-center gap-1 text-on-surface-variant font-body-sm text-body-sm">
                  <Icon name="location_on" size="sm" />
                  <span>{location}</span>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1">
              <span className="font-label-sm text-label-sm font-bold text-on-surface-variant uppercase tracking-wider">
                {t('publish.info.description')}
              </span>
              <p className="font-body-md text-body-md text-on-surface leading-relaxed whitespace-pre-line">
                {description}
              </p>
            </div>

            {/* Acepta a cambio */}
            <div className="space-y-2">
              <span className="font-label-sm text-label-sm font-bold text-on-surface-variant uppercase tracking-wider flex items-center gap-1.5">
                <Icon name="swap_horizontal_circle" size="xs" className="text-secondary" />
                {t('publish.preview.acceptsInExchange')}
              </span>
              <div className="flex flex-wrap gap-2">
                {wantedItems.map((item) => (
                  <Chip key={item} active className="cursor-default pointer-events-none">
                    {item}
                  </Chip>
                ))}
              </div>
            </div>

            {/* Owner Row */}
            <div className="pt-3 border-t border-surface-container-high/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar src={ownerAvatar} alt={ownerName} size="md" verified />
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="font-label-lg text-label-lg font-bold text-on-surface">
                      {ownerName}
                    </span>
                    <span className="inline-flex items-center text-primary" title={t('publish.preview.verified')}>
                      <Icon name="verified" size="xs" filled />
                    </span>
                  </div>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">
                    {t('publish.preview.verifiedOwner', { rating: ownerRating })}
                  </span>
                </div>
              </div>

              <Badge variant="primary-subtle" icon="verified_user">
                {t('publish.preview.guaranteed')}
              </Badge>
            </div>
          </article>
        </div>
      )}

      {/* ================= FIXED BOTTOM ACTION BAR ================= */}
      <div className="fixed bottom-0 inset-x-0 p-margin bg-surface/95 backdrop-blur-xl border-t border-surface-container-high/60 z-50 max-w-[390px] mx-auto">
        {currentStep === 1 && (
          <Button variant="primary" size="lg" fullWidth onClick={handleNextStep1}>
            {t('publish.continue')}
          </Button>
        )}

        {currentStep === 2 && (
          <Button variant="primary" size="lg" fullWidth onClick={handleNextStep2}>
            {t('publish.continue')}
          </Button>
        )}

        {currentStep === 3 && (
          <Button variant="primary" size="lg" fullWidth onClick={handleNextStep3}>
            {t('publish.continue')}
          </Button>
        )}

        {currentStep === 4 && (
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="lg"
              className="flex-1"
              onClick={() => setCurrentStep(2)}
            >
              {t('publish.edit')}
            </Button>
            <Button
              variant="primary"
              size="lg"
              className="flex-1"
              rightIcon="publish"
              isLoading={isPublishing}
              onClick={handlePublish}
            >
              {t('publish.publishNow')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
