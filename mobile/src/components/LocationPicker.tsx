import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { ApiError } from '@/services/http/apiClient';
import {
  geoService,
  type Department,
  type Municipality,
} from '@/services/geo/geo.service';
import { GeolocationError, getApproximatePosition } from '@/services/geo/geolocation';
import { Button } from './ui/Button';
import { Icon } from './ui/Icon';
import { Select } from './ui/Select';

export interface LocationPickerProps {
  /** Currently selected municipality (DANE code), if any. */
  municipalityCode: string | null;
  /** Department of the saved municipality; preselects the department list when editing. */
  departmentCode?: string | null;
  onChange: (municipality: Municipality | null) => void;
  error?: string;
}

type DetectError = 'denied' | 'timeout' | 'unavailable' | 'outside';

/**
 * Lets the user set their municipality in two ways: detect it with the phone's approximate
 * location, or pick the department and municipality from the official Colombian list.
 */
export const LocationPicker = ({
  municipalityCode,
  departmentCode,
  onChange,
  error,
}: LocationPickerProps) => {
  const { t } = useTranslation();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState(departmentCode ?? '');
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [listFailed, setListFailed] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectError, setDetectError] = useState<DetectError | null>(null);
  const [detected, setDetected] = useState<Municipality | null>(null);

  useEffect(() => {
    let active = true;
    geoService
      .listDepartments()
      .then((list) => {
        if (active) setDepartments(list);
      })
      .catch(() => {
        if (active) setListFailed(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedDepartment) {
      setMunicipalities([]);
      return;
    }
    let active = true;
    setIsLoadingList(true);
    setListFailed(false);
    geoService
      .listMunicipalities(selectedDepartment)
      .then((list) => {
        if (active) setMunicipalities(list);
      })
      .catch(() => {
        if (active) setListFailed(true);
      })
      .finally(() => {
        if (active) setIsLoadingList(false);
      });
    return () => {
      active = false;
    };
  }, [selectedDepartment]);

  const selected = useMemo(
    () =>
      detected && detected.code === municipalityCode
        ? detected
        : (municipalities.find((m) => m.code === municipalityCode) ?? null),
    [detected, municipalities, municipalityCode],
  );

  const handleDetect = useCallback(async () => {
    setDetectError(null);
    setIsDetecting(true);
    try {
      const position = await getApproximatePosition();
      const { municipality } = await geoService.resolvePosition(
        position.latitude,
        position.longitude,
      );
      setDetected(municipality);
      setSelectedDepartment(municipality.departmentCode);
      onChange(municipality);
    } catch (failure) {
      if (failure instanceof GeolocationError) {
        setDetectError(failure.reason);
      } else if (failure instanceof ApiError && failure.statusCode === 400) {
        setDetectError('outside');
      } else {
        setDetectError('unavailable');
      }
    } finally {
      setIsDetecting(false);
    }
  }, [onChange]);

  const handleDepartmentChange = (code: string) => {
    setSelectedDepartment(code);
    setDetected(null);
    onChange(null);
  };

  const handleMunicipalityChange = (code: string) => {
    const municipality = municipalities.find((m) => m.code === code) ?? null;
    setDetected(null);
    onChange(municipality);
  };

  return (
    <section aria-label={t('location.title')} className="flex flex-col gap-3 w-full">
      <Button
        variant="tonal"
        size="lg"
        fullWidth
        leftIcon="my_location"
        isLoading={isDetecting}
        onClick={handleDetect}
      >
        {isDetecting ? t('location.detecting') : t('location.useMyLocation')}
      </Button>

      {detectError && (
        <p role="alert" className="font-body-sm text-body-sm text-error">
          {t(`location.errors.${detectError}`)}
        </p>
      )}

      <div className="flex items-center gap-3 text-on-surface-variant">
        <span className="flex-1 h-px bg-surface-container-high" />
        <span className="font-label-md text-label-md">{t('location.orManual')}</span>
        <span className="flex-1 h-px bg-surface-container-high" />
      </div>

      <Select
        label={t('location.department')}
        placeholder={t('location.departmentPlaceholder')}
        leftIcon="map"
        value={selectedDepartment}
        options={departments.map((d) => ({ value: d.code, label: d.name }))}
        onChange={(event) => handleDepartmentChange(event.target.value)}
      />

      <Select
        label={t('location.municipality')}
        placeholder={
          isLoadingList ? t('location.loadingMunicipalities') : t('location.municipalityPlaceholder')
        }
        leftIcon="location_city"
        value={selected ? selected.code : ''}
        disabled={!selectedDepartment || isLoadingList}
        options={municipalities.map((m) => ({ value: m.code, label: m.name }))}
        onChange={(event) => handleMunicipalityChange(event.target.value)}
        error={error}
      />

      {listFailed && (
        <p role="alert" className="font-body-sm text-body-sm text-error">
          {t('location.errors.loadFailed')}
        </p>
      )}

      {selected && (
        <p
          role="status"
          className="inline-flex items-center gap-2 self-start px-3 py-2 rounded-full bg-primary/10 text-primary font-label-lg text-label-lg"
        >
          <Icon name="check_circle" size="sm" filled />
          {detected && detected.code === selected.code
            ? t('location.detected', { label: selected.label })
            : t('location.selected', { label: selected.label })}
        </p>
      )}

      <p className="flex items-start gap-2 font-body-sm text-body-sm text-on-surface-variant">
        <Icon name="lock" size="sm" className="shrink-0 mt-0.5" />
        {t('location.privacy')}
      </p>
    </section>
  );
};
