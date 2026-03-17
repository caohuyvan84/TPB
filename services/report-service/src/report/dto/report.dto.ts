export class CreateReportDto {
  name!: string;
  description?: string;
  supersetDashboardId?: number;
  supersetChartId?: number;
  category?: string;
  roleRestrictions?: string[];
}

export class GuestTokenDto {
  token!: string;
  expiresAt!: string;
}
