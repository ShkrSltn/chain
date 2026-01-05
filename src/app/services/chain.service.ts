import { Injectable, signal } from '@angular/core';
import { Chain, DayStatus } from '../models/chain.model';

@Injectable({
  providedIn: 'root'
})
export class ChainService {
  private chains = signal<Chain[]>([]);
  public readonly chainsSignal = this.chains.asReadonly();

  constructor() {
    this.loadFromStorage();
  }

  createChain(name: string, description?: string, goal?: string, startDate?: Date): Chain {
    const chain: Chain = {
      id: this.generateId(),
      name,
      description,
      goal,
      startDate: startDate || new Date(),
      days: new Map(),
      color: this.generateColor()
    };

    const currentChains = this.chains();
    this.chains.set([...currentChains, chain]);
    this.saveToStorage();
    return chain;
  }

  updateChain(chainId: string, updates: Partial<Chain>): void {
    const currentChains = this.chains();
    const index = currentChains.findIndex((c: Chain) => c.id === chainId);
    if (index !== -1) {
      const updated = { ...currentChains[index], ...updates };
      currentChains[index] = updated;
      this.chains.set([...currentChains]);
      this.saveToStorage();
    }
  }

  deleteChain(chainId: string): void {
    const currentChains = this.chains();
    this.chains.set(currentChains.filter((c: Chain) => c.id !== chainId));
    this.saveToStorage();
  }

  toggleDay(chainId: string, date: Date): void {
    const currentChains = this.chains();
    const chain = currentChains.find((c: Chain) => c.id === chainId);
    if (chain) {
      const dateKey = this.getDateKey(date);
      const currentStatus = chain.days.get(dateKey) || false;
      chain.days.set(dateKey, !currentStatus);
      this.chains.set([...currentChains]);
      this.saveToStorage();
    }
  }

  getDayStatus(chainId: string, date: Date): boolean {
    const chain = this.chains().find((c: Chain) => c.id === chainId);
    if (!chain) return false;
    const dateKey = this.getDateKey(date);
    return chain.days.get(dateKey) || false;
  }

  getMonthData(chainId: string, year: number, month: number): DayStatus[] {
    const chain = this.chains().find((c: Chain) => c.id === chainId);
    if (!chain) return [];

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: DayStatus[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateKey = this.getDateKey(date);
      days.push({
        date,
        completed: chain.days.get(dateKey) || false
      });
    }

    return days;
  }

  private getDateKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateColor(): string {
    const colors = [
      '#4A90E2', '#50C878', '#FF6B6B', '#FFD93D',
      '#9B59B6', '#E67E22', '#1ABC9C', '#34495E'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  private saveToStorage(): void {
    const chainsData = this.chains().map((chain: Chain) => ({
      ...chain,
      days: Array.from(chain.days.entries())
    }));
    localStorage.setItem('chains', JSON.stringify(chainsData));
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('chains');
      if (stored) {
        const chainsData = JSON.parse(stored);
        const chains: Chain[] = chainsData.map((c: { id: string; name: string; startDate: string; endDate?: string; days: [string, boolean][]; color?: string; description?: string; goal?: string }) => ({
          ...c,
          startDate: new Date(c.startDate),
          endDate: c.endDate ? new Date(c.endDate) : undefined,
          days: new Map(c.days || [])
        }));
        this.chains.set(chains);
      }
    } catch (error) {
      console.error('Error loading chains from storage:', error);
    }
  }
}
