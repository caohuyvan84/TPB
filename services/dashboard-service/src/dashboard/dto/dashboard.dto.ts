export class CreateDashboardDto {
  name!: string;
  description?: string;
  layout!: object;
  roleRestrictions?: string[];
}

export class CreateWidgetDto {
  widgetType!: string;
  title!: string;
  config!: object;
  position!: object;
  refreshIntervalSeconds?: number;
}

export class WidgetDataDto {
  widgetId!: string;
  data!: any;
  timestamp!: string;
}
