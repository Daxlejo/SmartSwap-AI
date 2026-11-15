import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@/hooks/useTranslation';
import { LocationPicker } from '@/components/LocationPicker';
import { PhotoSourceSheet } from '@/components/PhotoSourceSheet';
import { formatCop, formatCopDigits, sanitizeCopDigits } from '@/utils/currency';
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
import { FormErrorAlert } from '@/components/ui/FormErrorAlert';
import { useRevealOnError } from '@/hooks/useRevealOnError';

import { ItemImage } from '@/components/ui/ItemImage';

type WizardStep = 1 | 2 | 3 | 4 | 5;

/** Same limits as the API DTO (`ITEM_NAME_MAX_LENGTH`, `ITEM_DESCRIPTION_MAX_LENGTH`). */
const ITEM_NAME_MAX_LENGTH = 60;
const ITEM_DESCRIPTION_MAX_LENGTH = 500;

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
  const [isPhotoSheetOpen, setIsPhotoSheetOpen] = useState(false);


  // Wizard step state (1 to 5)
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);

  // Step 1: Photos state
  const [photos, setPhotos] = useState<string[]>([]);
  const [isCompressingPhoto, setIsCompressingPhoto] = useState(false);

  // Step 2: Information state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [condition, setCondition] = useState('Excelente estado');
  const [estimatedValue, setEstimatedValue] = useState('');
  // Items are located where they are published: the owner's municipality unless changed here
  const [municipalityCode, setMunicipalityCode] = useState<string | null>(
    currentUser?.municipalityCode ?? null,
  );
  const [locationLabel, setLocationLabel] = useState(currentUser?.location ?? '');
  const [isChangingLocation, setIsChangingLocation] = useState(!currentUser?.municipalityCode);

  // Step 3: Wanted items state
  const [wantedItems, setWantedItems] = useState<string[]>([]);
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
  // AI ideas for "what would you accept": offered as chips, never added on the user's behalf
  const [aiSuggestedWants, setAiSuggestedWants] = useState<string[]>([]);
  const [isEstimatingPrice, setIsEstimatingPrice] = useState(false);
  const [priceNotice, setPriceNotice] = useState<string | null>(null);

  // Step 4: Publishing loader state
  const [isPublishing, setIsPublishing] = useState(false);

  // Step 5: Success animation state
  const [animateCheck, setAnimateCheck] = useState(false);

  // Form errors: one notice per failed attempt (scrolled to and focused) plus a message per field
  const [errors, setErrors] = useState<FormErrors>({});
  const [formAlert, setFormAlert] = useState<string | null>(null);
  const [errorAttempt, setErrorAttempt] = useState(0);
  const formAlertRef = useRevealOnError<HTMLDivElement>(errorAttempt);

  const showFormAlert = (message: string) => {
    setFormAlert(message);
    setErrorAttempt((prev) => prev + 1);
  };

  const failValidation = (nextErrors: FormErrors, fieldLabels: string[]) => {
    setErrors((prev) => ({ ...prev, ...nextErrors }));
    showFormAlert(t('publish.errors.reviewFields', { fields: fieldLabels.join(', ') }));
  };

  const goToStep = (step: WizardStep) => {
    setFormAlert(null);
    setCurrentStep(step);
  };

  // Colombian market price from the AI; with no trustworthy answer there is no suggestion
  const requestPriceEstimate = async (input: {
    name: string;
    category: string;
    condition: string;
    description: string;
  }) => {
    setIsEstimatingPrice(true);
    setPriceNotice(null);
    try {
      const valuation = await aiService
        .estimateItemValue(input)
        .catch((): null => null);
      if (valuation) {
        setEstimatedValue(String(valuation.estimatedValue));
        setAiValueRange({
          min: valuation.minValue,
          max: valuation.maxValue,
          reasoning: valuation.reasoning,
        });
        if (errors.estimatedValue) {
          setErrors((prev) => ({ ...prev, estimatedValue: undefined }));
        }
      } else {
        setAiValueRange(null);
        setPriceNotice(t('publish.price.unavailable'));
      }
    } finally {
      setIsEstimatingPrice(false);
    }
  };

  const canEstimatePrice = name.trim().length >= 3 && category.trim().length > 0;

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

      const resolvedName = (analysis.name || name.trim()).slice(0, ITEM_NAME_MAX_LENGTH);
      const resolvedCategory = mapAiCategoryToUi(analysis.category);
      const resolvedCondition = mapAiConditionToUi(analysis.condition);
      const resolvedDescription = (analysis.description || description.trim()).slice(
        0,
        ITEM_DESCRIPTION_MAX_LENGTH,
      );

      if (resolvedName) {
        setName(resolvedName);
      }
      setCategory(resolvedCategory);
      setCondition(resolvedCondition);
      if (resolvedDescription) {
        setDescription(resolvedDescription);
      }

      if (analysis.aiTags.length > 0) {
        setAiTags(analysis.aiTags);
      }
      setAiSuggestedWants(analysis.suggestedWants.slice(0, 6));

      // The price comes only from the market-price estimate, never from the photo analysis
      if (resolvedName.length >= 3) {
        void requestPriceEstimate({
          name: resolvedName,
          category: resolvedCategory,
          condition: resolvedCondition,
          description: resolvedDescription,
        });
      }

      setErrors({});

      if (currentStep === 1) {
        goToStep(2);
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

  const openPhotoSheet = () => {
    if (photos.length < 4 && !isCompressingPhoto) setIsPhotoSheetOpen(true);
  };

  // Photos from the camera or the gallery, compressed on a canvas (1024px max, JPEG 0.82)
  const handleFiles = async (files: File[]) => {
    if (files.length === 0) return;

    setIsCompressingPhoto(true);
    setErrors((prev) => ({ ...prev, photos: undefined }));

    try {
      const compressedUrls: string[] = [];
      const availableSlots = Math.max(0, 4 - photos.length);

      for (let i = 0; i < files.length && compressedUrls.length < availableSlots; i++) {
        const compressedDataUrl = await compressImageToDataUrl(files[i], {
          maxDimension: 1024,
          quality: 0.82,
          mimeType: 'image/jpeg',
        });
        compressedUrls.push(compressedDataUrl);
      }

      if (compressedUrls.length > 0) {
        setPhotos((prev) => [...prev, ...compressedUrls].slice(0, 4));
      }
    } catch {
      setErrors((prev) => ({
        ...prev,
        photos: t('publish.errors.photoProcessing'),
      }));
    } finally {
      setIsCompressingPhoto(false);
    }
  };

  const handleRemovePhoto = (indexToRemove: number) => {
    setPhotos((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Step Navigation Backwards
  const handlePrevStep = () => {
    if (currentStep > 1 && currentStep <= 4) {
      setErrors((prev) => ({ ...prev, submit: undefined }));
      goToStep((currentStep - 1) as WizardStep);
    }
  };

  // Step 1 Validation & Next
  const handleNextStep1 = () => {
    if (photos.length === 0) {
      failValidation({ photos: t('publish.errors.photoRequired') }, [t('publish.steps.1')]);
      return;
    }
    setErrors((prev) => ({ ...prev, photos: undefined }));
    goToStep(2);
  };

  // Step 2 Validation & Next
  const handleNextStep2 = () => {
    const nextErrors: FormErrors = {};

    if (!name.trim()) {
      nextErrors.name = t('publish.errors.nameRequired');
    } else if (name.trim().length > ITEM_NAME_MAX_LENGTH) {
      nextErrors.name = t('publish.errors.nameTooLong', { max: ITEM_NAME_MAX_LENGTH });
    }
    if (!description.trim()) {
      nextErrors.description = t('publish.errors.descriptionRequired');
    } else if (description.trim().length > ITEM_DESCRIPTION_MAX_LENGTH) {
      nextErrors.description = t('publish.errors.descriptionTooLong', {
        max: ITEM_DESCRIPTION_MAX_LENGTH,
      });
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
    if (!municipalityCode) {
      nextErrors.location = t('publish.errors.locationRequired');
    }

    if (Object.keys(nextErrors).length > 0) {
      const fieldLabels: Record<keyof FormErrors, string> = {
        name: t('publish.info.name'),
        description: t('publish.info.description'),
        category: t('publish.info.category'),
        condition: t('publish.info.condition'),
        estimatedValue: t('publish.info.estimatedValue'),
        location: t('publish.info.location'),
        photos: t('publish.steps.1'),
        wantedItems: t('publish.steps.3'),
        submit: '',
      };
      failValidation(
        nextErrors,
        (Object.keys(nextErrors) as Array<keyof FormErrors>).map((key) => fieldLabels[key]),
      );
      return;
    }

    setErrors({});
    goToStep(3);
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
      failValidation({ wantedItems: t('publish.errors.wantedRequired') }, [t('publish.steps.3')]);
      return;
    }
    setErrors((prev) => ({ ...prev, wantedItems: undefined }));
    goToStep(4);
  };

  // Step 4 Real Publish Action -> POST /api/v1/items
  const handlePublish = async () => {
    if (isPublishing) return;

    setIsPublishing(true);
    setErrors((prev) => ({ ...prev, submit: undefined }));
    setFormAlert(null);

    try {
      // Upload every inline photo. A failure aborts the publish with a visible error; photos that
      // were already stored are kept as URLs so a retry only uploads the missing ones.
      const uploadedImages: string[] = [...photos];
      try {
        for (let index = 0; index < uploadedImages.length; index++) {
          if (uploadedImages[index].startsWith('data:image/')) {
            uploadedImages[index] = await itemsService.uploadImage(uploadedImages[index]);
          }
        }
      } catch (uploadError) {
        setPhotos(uploadedImages);
        const detail = uploadError instanceof Error ? uploadError.message : '';
        showFormAlert(t('publish.errors.photoUploadFailed', { detail }));
        return;
      }
      setPhotos(uploadedImages);

      const primaryImage = uploadedImages[0];

      await createItemReal({
        name: name.trim(),
        category,
        condition,
        description: description.trim(),
        estimatedValue: Number(estimatedValue),
        municipalityCode: municipalityCode ?? undefined,
        imageUrl: primaryImage,
        images: uploadedImages,
        wants: wantedItems,
      });

      goToStep(5);
    } catch (err) {
      if (err instanceof ApiError) {
        showFormAlert(
          err.statusCode === 401
            ? t('publish.errors.loginRequired')
            : err.message || t('publish.errors.publishFailed'),
        );
      } else if (err instanceof Error) {
        showFormAlert(err.message);
      } else {
        showFormAlert(t('publish.errors.publishUnexpected'));
      }
    } finally {
      setIsPublishing(false);
    }
  };

  // Display cover photo
  const coverPhoto = photos[0];
  const ownerName = currentUser?.name ?? '';
  const ownerAvatar = currentUser?.avatarUrl;

  const renderAiAssistantBanner = () => (
    <div className="rounded-2xl border border-primary/30 bg-primary/5 dark:bg-primary/10 p-3.5 space-y-2.5 transition-all">
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary text-on-primary flex items-center justify-center shrink-0 shadow-xs">
            <Icon
              name={isAnalyzingAi ? 'progress_activity' : 'auto_awesome'}
              size="sm"
              className={isAnalyzingAi ? 'animate-spin' : undefined}
              filled
            />
          </div>
          <div className="min-w-0">
            <p className="font-label-lg text-label-lg font-bold text-on-surface">
              {t('publish.ai.assistant')}
            </p>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
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
            'w-full min-h-11 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl font-label-lg text-label-lg font-bold transition-all shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            canAutocompleteWithAi && !isAnalyzingAi
              ? 'bg-primary text-on-primary hover:opacity-95 active:scale-95 cursor-pointer'
              : 'bg-surface-container-high text-on-surface-variant cursor-not-allowed',
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

      {aiTags.length > 0 && (
        <div className="pt-1 flex flex-col gap-2 border-t border-primary/15">
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
      <div className="flex flex-col items-center justify-between flex-1 px-margin pt-8 pb-8 text-center space-y-6">
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
            <ItemImage src={coverPhoto} alt={name} category={category} className="w-full h-full" />
          </div>

          <div className="flex flex-col flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1 mb-1">
              <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface break-words">
                {name}
              </h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-label-sm text-label-sm font-bold bg-success/10 text-success shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-success" />
                {t('publish.success.active')}
              </span>
            </div>

            <div className="flex items-center gap-1.5 font-body-sm text-body-sm text-on-surface-variant">
              <span>{t(`catalog.categories.${category}`, { defaultValue: category })}</span>
              <span>•</span>
              <span className="font-semibold text-on-surface">{formatCop(Number(estimatedValue))}</span>
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
    <div className="flex flex-col flex-1 px-margin pt-4">
      {/* Camera or gallery; its hidden file input stays mounted for the browser */}
      <PhotoSourceSheet
        isOpen={isPhotoSheetOpen}
        onClose={() => setIsPhotoSheetOpen(false)}
        remaining={Math.max(1, 4 - photos.length)}
        onFiles={(files) => void handleFiles(files)}
        inputLabel={t('publish.selectPhoto')}
      />

      {/* Top Step Navigation Header */}
      <div className="w-full mb-6">
        {/* Subtle Back link (Steps 2, 3, 4) */}
        {currentStep > 1 && (
          <button
            type="button"
            onClick={handlePrevStep}
            className="min-h-11 -ml-1 px-1 inline-flex items-center gap-1 font-label-lg text-label-lg text-on-surface-variant hover:text-primary transition-colors mb-2 select-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded"
          >
            <Icon name="arrow_back" size="sm" />
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
                    'min-w-11 min-h-11 flex flex-col items-center gap-1 select-none focus-visible:outline-none',
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
                      isUpcoming && 'text-on-surface-variant font-medium',
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

      {formAlert && (
        <FormErrorAlert
          ref={formAlertRef}
          testId="publish-error-alert"
          className="mb-5"
          message={formAlert}
          onDismiss={() => setFormAlert(null)}
          dismissLabel={t('auth.errors.dismiss')}
        />
      )}

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
            onClick={openPhotoSheet}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openPhotoSheet();
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
              {t('publish.photos.selected', { count: photos.length })}
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
                        <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded-md bg-surface/90 backdrop-blur-xs font-label-sm text-caption font-bold text-primary shadow-xs">
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
                    onClick={openPhotoSheet}
                    aria-label={`Agregar foto slot ${index + 1}`}
                    className="w-20 h-20 rounded-xl border-dashed border-2 border-surface-container-high/80 bg-surface-container-low hover:border-primary/50 hover:bg-surface-container transition-all flex flex-col items-center justify-center text-outline group shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <Icon
                      name="add"
                      size="sm"
                      className="group-hover:text-primary transition-colors"
                    />
                    <span className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">
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
            id="publish-name"
            label={t('publish.info.name')}
            subLabel={
              <span
                data-testid="publish-name-counter"
                className="font-body-sm text-body-sm text-on-surface-variant tabular-nums"
              >
                {t('publish.info.counter', { count: name.length, max: ITEM_NAME_MAX_LENGTH })}
              </span>
            }
            required
            maxLength={ITEM_NAME_MAX_LENGTH}
            placeholder={t('publish.info.namePlaceholder')}
            value={name}
            onChange={(e) => {
              setName(e.target.value.slice(0, ITEM_NAME_MAX_LENGTH));
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
              <span
                data-testid="publish-description-counter"
                className="font-body-sm text-body-sm text-on-surface-variant tabular-nums"
              >
                {t('publish.info.counter', {
                  count: description.length,
                  max: ITEM_DESCRIPTION_MAX_LENGTH,
                })}
              </span>
            </div>
            <textarea
              id="description"
              rows={3}
              maxLength={ITEM_DESCRIPTION_MAX_LENGTH}
              aria-invalid={errors.description ? true : undefined}
              aria-describedby={errors.description ? 'description-message' : undefined}
              placeholder={t('publish.info.descriptionPlaceholder')}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value.slice(0, ITEM_DESCRIPTION_MAX_LENGTH));
                if (errors.description) {
                  setErrors((prev) => ({ ...prev, description: undefined }));
                }
              }}
              className={clsx(
                'w-full p-3.5 bg-surface-container-low text-on-surface rounded-2xl font-body-md text-body-md resize-none',
                'placeholder:text-on-surface-variant transition-all duration-150',
                'focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30',
                errors.description && 'ring-2 ring-error/50 bg-error-container/20',
              )}
            />
            {errors.description && (
              <span id="description-message" className="font-body-sm text-body-sm text-error">
                {errors.description}
              </span>
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

          {/* Precio estimado (COP): editable; the AI only suggests it */}
          <div className="flex flex-col gap-1.5 w-full">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <label
                htmlFor="estimated-value-input"
                className="font-label-md text-label-md text-on-surface"
              >
                {t('publish.info.estimatedValue')}
              </label>
              <Button
                variant="ghost"
                size="sm"
                leftIcon={isEstimatingPrice ? undefined : 'auto_awesome'}
                isLoading={isEstimatingPrice}
                disabled={!canEstimatePrice || isEstimatingPrice}
                data-testid="estimate-price-btn"
                onClick={() =>
                  void requestPriceEstimate({
                    name: name.trim(),
                    category,
                    condition,
                    description: description.trim(),
                  })
                }
              >
                {t('publish.price.estimate')}
              </Button>
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
                type="text"
                inputMode="numeric"
                autoComplete="off"
                aria-invalid={errors.estimatedValue ? true : undefined}
                aria-describedby="estimated-value-message"
                value={formatCopDigits(estimatedValue)}
                onChange={(e) => {
                  setEstimatedValue(sanitizeCopDigits(e.target.value));
                  if (errors.estimatedValue) {
                    setErrors((prev) => ({ ...prev, estimatedValue: undefined }));
                  }
                }}
                placeholder={t('publish.info.valuePlaceholder')}
                className="w-full h-12 bg-transparent text-on-surface font-body-md text-body-md focus:outline-none"
              />
              <span className="font-label-md text-label-md font-bold text-on-surface-variant ml-2 select-none">
                COP
              </span>
            </div>
            <div id="estimated-value-message" className="flex flex-col gap-0.5">
              {errors.estimatedValue && (
                <span className="font-body-sm text-body-sm text-error">{errors.estimatedValue}</span>
              )}
              {aiValueRange ? (
                <>
                  <span
                    data-testid="ai-value-range"
                    className="font-label-md text-label-md text-primary font-bold"
                  >
                    {t('publish.ai.valueRange', {
                      min: formatCop(aiValueRange.min),
                      max: formatCop(aiValueRange.max),
                    })}
                  </span>
                  {aiValueRange.reasoning && (
                    <span className="font-body-sm text-body-sm text-on-surface-variant">
                      {aiValueRange.reasoning}
                    </span>
                  )}
                  <span className="font-body-sm text-body-sm text-on-surface-variant">
                    {t('publish.price.editable')}
                  </span>
                </>
              ) : priceNotice ? (
                <span
                  data-testid="price-unavailable"
                  className="font-body-sm text-body-sm text-on-surface-variant"
                >
                  {priceNotice}
                </span>
              ) : (
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  {t('publish.price.helper')}
                </span>
              )}
            </div>
          </div>

          {/* Ubicación */}
          <div className="flex flex-col gap-1.5 w-full">
            <span className="font-label-md text-label-md text-on-surface">
              {t('publish.info.location')}
            </span>
            {municipalityCode && !isChangingLocation ? (
              <div className="flex items-center justify-between gap-3 min-h-[52px] px-4 rounded-2xl bg-surface-container-low">
                <span className="flex items-center gap-2 font-body-md text-body-md text-on-surface">
                  <Icon name="location_on" size="md" className="text-primary" />
                  {locationLabel}
                </span>
                <Button variant="ghost" size="sm" onClick={() => setIsChangingLocation(true)}>
                  {t('publish.info.locationChange')}
                </Button>
              </div>
            ) : (
              <LocationPicker
                municipalityCode={municipalityCode}
                departmentCode={currentUser?.departmentCode}
                onChange={(municipality) => {
                  setMunicipalityCode(municipality?.code ?? null);
                  setLocationLabel(municipality?.label ?? '');
                  if (municipality) {
                    setIsChangingLocation(false);
                    if (errors.location) setErrors((prev) => ({ ...prev, location: undefined }));
                  }
                }}
                error={errors.location}
              />
            )}
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              {t('publish.info.locationHelper')}
            </span>
          </div>
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
              {t('publish.wants.ideas')}
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

          {aiSuggestedWants.length > 0 && (
            <div className="space-y-2" data-testid="ai-suggested-wants">
              <span className="font-label-md text-label-md font-semibold text-on-surface flex items-center gap-1.5">
                <Icon name="auto_awesome" size="xs" className="text-primary" />
                {t('publish.wants.aiIdeas')}
              </span>
              <div className="flex flex-wrap gap-2">
                {aiSuggestedWants.map((item) => {
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
          )}

          {/* Added Items List (Removable Chips with ×) */}
          <div className="space-y-2">
            <span className="font-label-md text-label-md font-semibold text-on-surface">
              {t('publish.wants.accepted', { count: wantedItems.length })}
            </span>

            {wantedItems.length === 0 ? (
              <div
                data-testid="accepted-wants-empty"
                className={clsx(
                  'p-4 rounded-xl border border-dashed text-center',
                  errors.wantedItems
                    ? 'border-error/50 bg-error-container/20'
                    : 'border-outline/50 bg-surface-container-low',
                )}
              >
                <p
                  className={clsx(
                    'font-body-sm text-body-sm',
                    errors.wantedItems ? 'text-error' : 'text-on-surface-variant',
                  )}
                >
                  {t('publish.wants.empty')}
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

          {/* Large ObjectCard Preview */}
          <article className="flex flex-col rounded-2xl bg-surface-container-lowest p-4 shadow-sm space-y-4 border border-surface-container-high/60">
            {/* Large Image (h-56 full width rounded-2xl) */}
            <div className="relative w-full h-56 rounded-2xl bg-surface-container-high overflow-hidden shadow-xs">
              <ItemImage src={coverPhoto} alt={name} category={category} className="w-full h-full" />
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
                    {formatCop(Number(estimatedValue))}
                  </span>
                </div>

                <div className="flex items-center gap-1 text-on-surface-variant font-body-sm text-body-sm">
                  <Icon name="location_on" size="sm" />
                  <span>{locationLabel}</span>
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
                <Avatar src={ownerAvatar} alt={ownerName} size="md" />
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="font-label-lg text-label-lg font-bold text-on-surface">
                      {ownerName}
                    </span>
                  </div>
                </div>
              </div>

            </div>
          </article>
        </div>
      )}

      {/* ================= BOTTOM ACTION BAR =================
          Sticky, not fixed: it takes its own room at the end of the flow, so however tall it
          grows (two-line labels, large system font) it never covers the last field */}
      <div aria-hidden="true" className="h-6 shrink-0" />
      <div className="sticky bottom-0 mt-auto -mx-margin px-margin pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] bg-surface border-t border-surface-container-high z-40">
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
              onClick={() => goToStep(2)}
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
