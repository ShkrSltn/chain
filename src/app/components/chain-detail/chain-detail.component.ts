import { Component, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ChainService } from '../../services/chain.service';
import { MonthVoronoiComponent } from '../month-voronoi/month-voronoi.component';
import { Chain } from '../../models/chain.model';

@Component({
  selector: 'app-chain-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, MonthVoronoiComponent],
  templateUrl: './chain-detail.component.html',
  styleUrl: './chain-detail.component.css'
})
export class ChainDetailComponent {
  chainId: string = '';
  readonly currentYear: number = new Date().getFullYear();

  chain = computed(() => {
    const chains = this.chainService.chainsSignal();
    return chains.find((c: Chain) => c.id === this.chainId);
  });

  stats = computed(() => {
    const chain = this.chain();
    return this.getCompletionStats(chain);
  });

  months = Array.from({ length: 12 }, (_, i) => i);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private chainService: ChainService
  ) {
    this.route.params.subscribe(params => {
      this.chainId = params['id'];
    });
  }

  getCompletionStats(chain: Chain | undefined): { completed: number; total: number } {
    if (!chain) return { completed: 0, total: 0 };
    const completed = Array.from(chain.days.values()).filter(Boolean).length;
    const startDate = new Date(chain.startDate);
    const endDate = chain.endDate ? new Date(chain.endDate) : new Date();
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    return { completed, total: Math.max(totalDays, completed) };
  }
}
