import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ChainService } from '../../services/chain.service';
import { Chain } from '../../models/chain.model';

@Component({
  selector: 'app-chain-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './chain-list.component.html',
  styleUrl: './chain-list.component.css'
})
export class ChainListComponent {
  chains = computed(() => this.chainService.chainsSignal());

  constructor(private chainService: ChainService) {}

  getChainStats(chain: Chain): { completed: number; total: number } {
    return this.getCompletionStats(chain);
  }

  deleteChain(chainId: string, event: Event): void {
    event.stopPropagation();
    if (confirm('Are you sure you want to delete this chain?')) {
      this.chainService.deleteChain(chainId);
    }
  }

  getCompletionStats(chain: Chain): { completed: number; total: number } {
    const completed = Array.from(chain.days.values()).filter(Boolean).length;
    const startDate = new Date(chain.startDate);
    const endDate = chain.endDate ? new Date(chain.endDate) : new Date();
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    return { completed, total: Math.max(totalDays, completed) };
  }

  getStatsText(chain: Chain): string {
    const stats = this.getCompletionStats(chain);
    return `${stats.completed} / ${stats.total} days completed`;
  }
}
