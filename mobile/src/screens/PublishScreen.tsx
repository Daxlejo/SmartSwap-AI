import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { useApp } from '@/context/AppContext';
import { itemsService } from '@/services/items/items.service';
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

export const PublishScreen: React.FC = () => {
  const navigate = useNavigate();
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
  const [location, setLocation] = useState(currentUser?.location || 'Madrid, España');

  // Step 3: Wanted items state
  const [wantedItems, setWantedItems] = useState<string[]>(['Cámara', 'iPad']);
  const [searchQuery, setSearchQuery] = useState('');

  // Step 4: Publishing loader state
  const [isPublishing, setIsPublishing] = useState(false);

  // Step 5: Success animation state
  const [animateCheck, setAnimateCheck] = useState(false);

  // Form errors
  const [errors, setErrors] = useState<FormErrors>({});

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

  // Real Photo selection & HTML5 Canvas compression (1024px max, JPEG 0.82)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsCompressingPhoto(true);
    setErrors((prev) => ({ ...prev, photos: undefined }));

    try {
      const compressedUrls: string[] = [];
      const availableSlots = Math.max(0, 4 - (photos.length === 1 && photos[0] === bikeImg ? 0 : photos.length));

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
        photos: 'No se pudo procesar la imagen seleccionada. Intenta con otro archivo.',
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
        photos: 'Agrega al menos una foto de tu artículo para continuar.',
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
      nextErrors.name = 'El nombre del artículo es obligatorio.';
    }
    if (!description.trim()) {
      nextErrors.description = 'La descripción es obligatoria.';
    }
    if (!category.trim()) {
      nextErrors.category = 'Selecciona una categoría.';
    }
    if (!condition.trim()) {
      nextErrors.condition = 'Selecciona el estado del artículo.';
    }
    const parsedVal = Number(estimatedValue);
    if (!estimatedValue || isNaN(parsedVal) || parsedVal <= 0) {
      nextErrors.estimatedValue = 'Ingresa un valor estimado válido en USD.';
    }
    if (!location.trim()) {
      nextErrors.location = 'La ubicación es obligatoria.';
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
    if (!wantedItems.includes(trimmed)) {
      setWantedItems((prev) => [...prev, trimmed]);
      if (errors.wantedItems) {
        setErrors((prev) => ({ ...prev, wantedItems: undefined }));
      }
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
        wantedItems: 'Debes agregar al menos 1 artículo que aceptarías a cambio.',
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
            submit: 'Debes iniciar sesión para publicar un artículo en el catálogo.',
          }));
        } else {
          setErrors((prev) => ({
            ...prev,
            submit: err.message || 'No se pudo publicar el artículo. Intenta nuevamente.',
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
          submit: 'Ocurrió un error al publicar tu artículo.',
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
              ¡Artículo publicado!
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Tu <span className="font-semibold text-on-surface">{name}</span> ya está visible para
              la red SmartSwap.
            </p>
          </div>
        </div>

        {/* Success Item Summary Card */}
        <section
          aria-label="Resumen de publicación activa"
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
                Activo
              </span>
            </div>

            <div className="flex items-center gap-1.5 font-body-sm text-body-sm text-on-surface-variant">
              <span>{category}</span>
              <span>•</span>
              <span className="font-semibold text-on-surface">${estimatedValue} USD</span>
            </div>

            <span className="font-label-sm text-label-sm text-primary font-bold mt-1 flex items-center gap-1">
              <Icon name="sync_alt" size="xs" />
              Listo para rutas de intercambio
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
            Buscar un canje circular
          </Button>

          <Button
            variant="outline"
            size="lg"
            fullWidth
            leftIcon="person"
            onClick={() => navigate('/profile')}
          >
            Ver mi perfil
          </Button>

          <button
            type="button"
            onClick={() => navigate('/home')}
            className="font-label-md text-label-md text-on-surface-variant hover:text-primary py-2 transition-colors select-none text-center focus-visible:outline-none focus-visible:underline"
          >
            Volver al inicio
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
        aria-label="Seleccionar foto del artículo"
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
            <span>Paso anterior</span>
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
                    {step.label}
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
              Agrega fotos de tu artículo
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Toma una foto con tu cámara o elige de tu galería (compresión automática HD).
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
                {isCompressingPhoto ? 'Optimizando imagen...' : 'Toca para agregar fotos'}
              </span>
              <span className="font-body-sm text-body-sm text-on-surface-variant mt-0.5 block">
                Cámara o Galería • Máx. 1024px JPEG (hasta 4 fotos)
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
                        alt={`Foto del artículo ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      {index === 0 && (
                        <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded-md bg-surface/90 backdrop-blur-xs font-label-sm text-[9px] font-bold text-primary shadow-xs">
                          Portada
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
        </div>
      )}

      {/* ================= STEP 2: INFORMACIÓN ================= */}
      {currentStep === 2 && (
        <div className="flex flex-col space-y-5">
          <div className="space-y-1">
            <h1 className="font-headline-md text-headline-md font-bold text-on-surface">
              Cuéntanos sobre tu artículo
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Completa los detalles para que otros usuarios conozcan tu propuesta.
            </p>
          </div>

          {/* Nombre del artículo */}
          <Input
            label="Nombre del artículo"
            required
            placeholder="Ej. Bicicleta Trek Marlin 7"
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
                Descripción
              </label>
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                {description.length} caracteres
              </span>
            </div>
            <textarea
              id="description"
              rows={3}
              placeholder="Describe el estado, características y detalles relevantes"
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
            <label className="font-label-md text-label-md text-on-surface">Categoría</label>
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
                  {cat}
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
              Estado del artículo
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
                      {cond.label}
                    </span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant leading-tight mt-0.5">
                      {cond.desc}
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
                Valor estimado
              </label>
              <span className="font-body-sm text-body-sm text-on-surface-variant">Referencial</span>
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
            label="Ubicación"
            leftIcon="location_on"
            placeholder="Ej. Madrid, España"
            value={location}
            onChange={(e) => {
              setLocation(e.target.value);
              if (errors.location) setErrors((prev) => ({ ...prev, location: undefined }));
            }}
            error={errors.location}
            helperText="Zona de entrega o punto de encuentro"
          />
        </div>
      )}

      {/* ================= STEP 3: ¿QUÉ ACEPTARÍAS? ================= */}
      {currentStep === 3 && (
        <div className="flex flex-col space-y-6">
          <div className="space-y-1">
            <h1 className="font-headline-md text-headline-md font-bold text-on-surface">
              ¿Qué artículos aceptarías a cambio?
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Esto ayuda al sistema a encontrar rutas de canje para ti.
            </p>
          </div>

          {/* Search / Add Input */}
          <div className="flex gap-2 items-center">
            <div className="flex-1">
              <Input
                placeholder="Buscar artículos..."
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
              Agregar
            </Button>
          </div>

          {/* Suggestion Chips */}
          <div className="space-y-2">
            <span className="font-label-md text-label-md font-semibold text-on-surface">
              Sugerencias populares
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
                Artículos aceptados ({wantedItems.length})
              </span>
              {wantedItems.length > 0 && (
                <span className="font-label-sm text-label-sm text-primary font-bold">
                  {wantedItems.length >= 2 ? 'Variedad óptima' : 'Mínimo 1'}
                </span>
              )}
            </div>

            {wantedItems.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-error/50 bg-error-container/20 text-center">
                <p className="font-body-sm text-body-sm text-error">
                  Debes agregar al menos 1 artículo que aceptarías a cambio.
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
                Descubre más opciones
              </span>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                Cuantos más artículos aceptes, más rutas encontrará el sistema.
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
              Vista previa de tu publicación
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Así verán tu artículo otros usuarios.
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
                {category}
              </span>
            </div>

            {/* Title & Badges */}
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-headline-md text-headline-md font-bold text-on-surface">
                  {name}
                </h2>
                <Badge variant="surface" className="shrink-0">
                  {condition}
                </Badge>
              </div>

              {/* Estimated Value & Location */}
              <div className="flex items-center justify-between py-2 border-y border-surface-container-high/60">
                <div className="flex flex-col">
                  <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">
                    Valor estimado
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
                Descripción
              </span>
              <p className="font-body-md text-body-md text-on-surface leading-relaxed whitespace-pre-line">
                {description}
              </p>
            </div>

            {/* Acepta a cambio */}
            <div className="space-y-2">
              <span className="font-label-sm text-label-sm font-bold text-on-surface-variant uppercase tracking-wider flex items-center gap-1.5">
                <Icon name="swap_horizontal_circle" size="xs" className="text-secondary" />
                Acepta a cambio:
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
                    <span className="inline-flex items-center text-primary" title="Verificado">
                      <Icon name="verified" size="xs" filled />
                    </span>
                  </div>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">
                    ★ {ownerRating} • Dueño verificado
                  </span>
                </div>
              </div>

              <Badge variant="primary-subtle" icon="verified_user">
                Garantizado
              </Badge>
            </div>
          </article>
        </div>
      )}

      {/* ================= FIXED BOTTOM ACTION BAR ================= */}
      <div className="fixed bottom-0 inset-x-0 p-margin bg-surface/95 backdrop-blur-xl border-t border-surface-container-high/60 z-50 max-w-[390px] mx-auto">
        {currentStep === 1 && (
          <Button variant="primary" size="lg" fullWidth onClick={handleNextStep1}>
            Continuar
          </Button>
        )}

        {currentStep === 2 && (
          <Button variant="primary" size="lg" fullWidth onClick={handleNextStep2}>
            Continuar
          </Button>
        )}

        {currentStep === 3 && (
          <Button variant="primary" size="lg" fullWidth onClick={handleNextStep3}>
            Continuar
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
              Editar
            </Button>
            <Button
              variant="primary"
              size="lg"
              className="flex-1"
              rightIcon="publish"
              isLoading={isPublishing}
              onClick={handlePublish}
            >
              Publicar ahora
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
