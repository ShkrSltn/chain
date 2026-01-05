import { Component, Input, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChainService } from '../../services/chain.service';
import { VoronoiService, VoronoiCell } from '../../services/voronoi.service';
import { DayStatus } from '../../models/chain.model';

@Component({
  selector: 'app-month-voronoi',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './month-voronoi.component.html',
  styleUrl: './month-voronoi.component.css'
})
export class MonthVoronoiComponent {
  @Input() chainId!: string;
  @Input() year!: number;
  @Input() month!: number; // 0-11
  @Input() width: number = 300;
  @Input() height: number = 300;

  // Контроль размеров ячеек (в процентах от среднего)
  @Input() minCellSizePercent: number = 90;  // 80% от среднего размера
  @Input() maxCellSizePercent: number = 110; // 125% от среднего размера

  monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  monthNamesShort = [
    'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
    'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'
  ];

  days = computed(() => {
    return this.chainService.getMonthData(this.chainId, this.year, this.month);
  });

  cells = computed(() => {
    const daysData = this.days();
    if (daysData.length === 0) return [];
    return this.voronoiService.generateVoronoiDiagram(daysData, this.width, this.height);
  });

  monthName = computed(() => this.monthNames[this.month]);

  constructor(
    private chainService: ChainService,
    private voronoiService: VoronoiService
  ) {}

  toggleDay(cell: VoronoiCell): void {
    if (cell.isMonthLabel) return; // Don't toggle month label
    this.chainService.toggleDay(this.chainId, cell.day.date);
  }

  getCellClass(cell: VoronoiCell): string {
    if (cell.isMonthLabel) return 'month-label';
    return cell.day.completed ? 'completed' : 'pending';
  }

  getMonthNameShort(): string {
    return this.monthNamesShort[this.month];
  }
}
