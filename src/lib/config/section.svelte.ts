import type { Form, FormValue } from '$lib/form';
import { toJsonValue, type IntoJsonValue } from '$lib/types/utils';
import type { JsonValue } from '@zenstackhq/orm';

export abstract class ConfigSection<
  OptionsForm extends Form = Form,
  Options extends FormValue<OptionsForm> = FormValue<OptionsForm>
> {
  declare static id: string;
  public data = $state() as unknown as Options;

  // The registry hydrates from the parsed config JSON, which may be missing
  // a section; the section's own form validates the shape when rendered.
  constructor(data: JsonValue | undefined) {
    this.data = data as unknown as Options;
  }

  toJSON() {
    return toJsonValue(this.data as IntoJsonValue);
  }

  abstract get optionsForm(): OptionsForm;
}

/**
 * A concrete config section class, e.g. `PluginsConfigSection`. Passing the
 * class itself (see `AppConfig.getSection`) ties the returned instance to the
 * section it was registered as, instead of a caller-side cast. `id` is the
 * static key the class is registered under (and stored in the config JSON).
 */
export type ConfigSectionClass<T extends ConfigSection = ConfigSection> = (new (_data: JsonValue | undefined) => T) & {
  id: string;
};
