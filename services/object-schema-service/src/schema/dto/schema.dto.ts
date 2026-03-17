export class CreateObjectTypeDto {
  name!: string;
  displayName!: string;
  displayNamePlural!: string;
  icon?: string;
}

export class CreateFieldDto {
  name!: string;
  displayName!: string;
  fieldType!: string;
  isRequired?: boolean;
  defaultValue?: any;
  validationRules?: any[];
  sortOrder?: number;
}

export class ObjectSchemaDto {
  id!: string;
  name!: string;
  displayName!: string;
  version!: number;
  fields!: FieldDto[];
}

export class FieldDto {
  id!: string;
  name!: string;
  displayName!: string;
  fieldType!: string;
  isRequired!: boolean;
  isReadOnly!: boolean;
  defaultValue?: any;
  validationRules!: any[];
  sortOrder!: number;
}
