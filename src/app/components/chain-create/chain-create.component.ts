import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ChainService } from '../../services/chain.service';

@Component({
  selector: 'app-chain-create',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chain-create.component.html',
  styleUrl: './chain-create.component.css'
})
export class ChainCreateComponent {
  name: string = '';
  description: string = '';
  goal: string = '';
  startDate: string = new Date().toISOString().split('T')[0];

  constructor(
    private chainService: ChainService,
    private router: Router
  ) {}

  onSubmit(): void {
    if (!this.name.trim()) {
      alert('Please enter a chain name');
      return;
    }

    const startDate = new Date(this.startDate);
    const chain = this.chainService.createChain(
      this.name.trim(),
      this.description.trim() || undefined,
      this.goal.trim() || undefined,
      startDate
    );

    this.router.navigate(['/chain', chain.id]);
  }

  cancel(): void {
    this.router.navigate(['/']);
  }
}
