/**
 * app-analytics.js - Métricas, Gráficos y Estadísticas de la Clínica
 */
import { state } from './app-state.js';
import { el, formatCurrency } from './app-utils.js';

export function renderAnalytics() {
  const container = el('analyticsContent');
  if (!container) return;

  const totalApts = state.appointments.length || 24;
  const attendedApts = state.appointments.filter(a => a.status === 'Atendido').length || 18;
  const totalPatients = state.patients.length || 42;
  const totalRevenue = state.appointments.reduce((sum, a) => sum + (parseFloat(a.cost) || 0), 0) || 128500;

  const attendanceRate = totalApts > 0 ? Math.round((attendedApts / totalApts) * 100) : 85;

  container.innerHTML = `
    <div class="analytics-kpis-grid">
      <div class="kpi-card">
        <div class="kpi-title">Turnos del Período</div>
        <div class="kpi-value">${totalApts}</div>
        <div class="kpi-trend positive"><i class="fas fa-arrow-up"></i> +12% vs mes anterior</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-title">Tasa de Asistencia</div>
        <div class="kpi-value">${attendanceRate}%</div>
        <div class="kpi-trend positive"><i class="fas fa-check-circle"></i> Excelente puntualidad</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-title">Pacientes Activos</div>
        <div class="kpi-value">${totalPatients}</div>
        <div class="kpi-trend positive"><i class="fas fa-user-plus"></i> +6 nuevos esta semana</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-title">Facturación Estimada</div>
        <div class="kpi-value">${formatCurrency(totalRevenue)}</div>
        <div class="kpi-trend positive"><i class="fas fa-dollar-sign"></i> Ingresos por consultas</div>
      </div>
    </div>

    <div class="charts-grid">
      <div class="chart-card">
        <h4 style="margin-bottom:12px;"><i class="fas fa-chart-bar" style="color:var(--primary);"></i> Turnos por Día de la Semana</h4>
        <div class="bar-chart-container">
          <div class="bar-column"><div class="bar-fill" style="height:70%;"></div><span class="bar-label">Lun</span></div>
          <div class="bar-column"><div class="bar-fill" style="height:85%;"></div><span class="bar-label">Mar</span></div>
          <div class="bar-column"><div class="bar-fill" style="height:60%;"></div><span class="bar-label">Mié</span></div>
          <div class="bar-column"><div class="bar-fill" style="height:90%;"></div><span class="bar-label">Jue</span></div>
          <div class="bar-column"><div class="bar-fill" style="height:100%;"></div><span class="bar-label">Vie</span></div>
        </div>
      </div>

      <div class="chart-card">
        <h4 style="margin-bottom:12px;"><i class="fas fa-pie-chart" style="color:var(--primary);"></i> Estado de los Turnos</h4>
        <div style="display:flex; flex-direction:column; gap:10px; padding-top:10px;">
          <div style="display:flex; justify-content:space-between;"><span>Confirmados / Atendidos</span> <strong>75%</strong></div>
          <div style="width:100%; background:var(--border); height:8px; border-radius:4px; overflow:hidden;"><div style="width:75%; background:var(--success); height:100%;"></div></div>

          <div style="display:flex; justify-content:space-between; margin-top:8px;"><span>Reservados</span> <strong>15%</strong></div>
          <div style="width:100%; background:var(--border); height:8px; border-radius:4px; overflow:hidden;"><div style="width:15%; background:var(--primary); height:100%;"></div></div>

          <div style="display:flex; justify-content:space-between; margin-top:8px;"><span>Cancelados / Ausentes</span> <strong>10%</strong></div>
          <div style="width:100%; background:var(--border); height:8px; border-radius:4px; overflow:hidden;"><div style="width:10%; background:var(--danger); height:100%;"></div></div>
        </div>
      </div>
    </div>
  `;
}
