import {
  NERState,
  MonitoredLocation,
  RoadSegment,
  ShelterFacility,
  FieldReport,
  EmergencyBulletin
} from '../types';
import {
  INITIAL_MONITORED_LOCATIONS,
  INITIAL_ROAD_SEGMENTS,
  INITIAL_SHELTERS,
  INITIAL_FIELD_REPORTS,
  INITIAL_BULLETINS
} from '../data/nerGeography';

/**
 * Typed frontend intelligence service abstraction.
 * Provides clean asynchronous interface simulating future FastAPI / PostGIS endpoints.
 * Operates on strongly-typed memory state with zero backend dependencies.
 */
class IntelligenceService {
  private locations: MonitoredLocation[] = [...INITIAL_MONITORED_LOCATIONS];
  private roads: RoadSegment[] = [...INITIAL_ROAD_SEGMENTS];
  private shelters: ShelterFacility[] = [...INITIAL_SHELTERS];
  private reports: FieldReport[] = [...INITIAL_FIELD_REPORTS];
  private bulletins: EmergencyBulletin[] = [...INITIAL_BULLETINS];

  // Locations Query
  async getLocations(state?: NERState, district?: string): Promise<MonitoredLocation[]> {
    return new Promise((resolve) => {
      let filtered = [...this.locations];
      if (state) {
        filtered = filtered.filter((l) => l.state === state);
      }
      if (district && district !== 'ALL') {
        filtered = filtered.filter((l) => l.district.toLowerCase() === district.toLowerCase());
      }
      resolve(filtered);
    });
  }

  async getLocationById(id: string): Promise<MonitoredLocation | undefined> {
    return new Promise((resolve) => {
      resolve(this.locations.find((l) => l.id === id));
    });
  }

  // Roads Query
  async getRoads(state?: NERState): Promise<RoadSegment[]> {
    return new Promise((resolve) => {
      let filtered = [...this.roads];
      if (state) {
        filtered = filtered.filter((r) => r.state === state);
      }
      resolve(filtered);
    });
  }

  // Shelters Query
  async getShelters(state?: NERState, district?: string): Promise<ShelterFacility[]> {
    return new Promise((resolve) => {
      let filtered = [...this.shelters];
      if (state) {
        filtered = filtered.filter((s) => s.state === state);
      }
      if (district && district !== 'ALL') {
        filtered = filtered.filter((s) => s.district.toLowerCase() === district.toLowerCase());
      }
      resolve(filtered);
    });
  }

  // Field Reports Query
  async getFieldReports(state?: NERState): Promise<FieldReport[]> {
    return new Promise((resolve) => {
      let filtered = [...this.reports];
      if (state) {
        filtered = filtered.filter((r) => r.state === state);
      }
      resolve(filtered);
    });
  }

  // Submit Field Report
  async addFieldReport(newReport: Omit<FieldReport, 'id' | 'timestamp' | 'verifiedByAuthority'>): Promise<FieldReport> {
    return new Promise((resolve) => {
      const created: FieldReport = {
        ...newReport,
        id: `REP-${String(this.reports.length + 1).padStart(2, '0')}`,
        timestamp: 'Just now',
        verifiedByAuthority: false
      };
      this.reports = [created, ...this.reports];
      resolve(created);
    });
  }

  // Bulletins Query
  async getBulletins(state?: NERState): Promise<EmergencyBulletin[]> {
    return new Promise((resolve) => {
      let filtered = [...this.bulletins];
      if (state) {
        filtered = filtered.filter((b) => b.targetState === state);
      }
      resolve(filtered);
    });
  }

  // What-If Simulation
  async runWhatIfSimulation(
    locationId: string,
    params: { additionalRainfallMm: number; simulateBlockedRoadId?: string }
  ): Promise<{
    simulatedScore: number;
    simulatedLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
    affectedPopulationDelta: number;
    cascadingNotes: string;
    routeSevered: boolean;
  }> {
    const loc = this.locations.find((l) => l.id === locationId);
    if (!loc) {
      throw new Error(`Location ${locationId} not found`);
    }

    // Mathematical simulation based on rainfall memory & slope sensitivity
    const rainfallEffect = params.additionalRainfallMm * 0.45;
    const baseScore = loc.riskScore;
    const simulatedScore = Math.min(100, Math.round(baseScore + rainfallEffect));

    let simulatedLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (simulatedScore >= 85) simulatedLevel = 'CRITICAL';
    else if (simulatedScore >= 70) simulatedLevel = 'HIGH';
    else if (simulatedScore >= 50) simulatedLevel = 'MODERATE';

    const popDelta = Math.round(loc.vulnerablePopulationEst * (simulatedScore / 100) * 0.35);

    return {
      simulatedScore,
      simulatedLevel,
      affectedPopulationDelta: popDelta,
      cascadingNotes:
        params.additionalRainfallMm > 30
          ? `High probability of secondary debris slumping onto drainage culverts. Soil saturation projected at ${Math.min(99, loc.soilMoisturePct + 12)}%.`
          : 'Moderate saturation increase; localized rockfalls probable along unlined cuttings.',
      routeSevered: params.simulateBlockedRoadId ? true : simulatedScore >= 80
    };
  }
}

export const intelligenceService = new IntelligenceService();
