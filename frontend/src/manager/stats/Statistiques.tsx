import React, { useState, useEffect } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import api from '../../services/api';
import styles from './Statistiques.module.css';

interface AvisStats {
    moyenne: number | string;
    nombre: number;
}

interface DailySummary {
    chiffre_affaires: number;
    repartition_paiement: Record<string, number>;
    [key: string]: any;
}

interface PlatVendu {
    nom: string;
    quantite: number;
    [key: string]: any;
}

interface HeureAffluence {
    heure: string;
    commandes: number;
    [key: string]: any;
}

interface CommandeHistorique {
    id: number | string;
    table: string;
    plat: string;
    date: string;
    [key: string]: any;
}

interface DashboardData {
    couvertsJour: number;
    platsPlusVendus: PlatVendu[];
    heuresAffluence: HeureAffluence[];
    historiqueCommandes: CommandeHistorique[];
    [key: string]: any;
}

const Statistiques: React.FC = () => {
    const [data, setData] = useState<DashboardData | null>(null);
    const [avisStats, setAvisStats] = useState<AvisStats>({ moyenne: 0, nombre: 0 });
    const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const dashboardData = await api.get('/stats/dashboard');
                if (dashboardData) setData(dashboardData as DashboardData);

                const avisData = await api.get('/avis/stats');
                if (avisData) setAvisStats(avisData as AvisStats);

                const today = new Date().toISOString().split('T')[0];
                const summaryData = await api.get(`/exports/summary?date=${today}`);
                if (summaryData) setDailySummary(summaryData as DailySummary);
            } catch (err) {
                console.error('Erreur chargement stats:', err);
            }
        };
        fetchStats();
    }, []);

    if (!data) return <p>Chargement des statistiques...</p>;

    return (
        <div>
            <div className="page-header">
                <h2 className="page-title">Statistiques & Historique</h2>
                <p className="page-subtitle">Analysez les performances et l'activité du restaurant.</p>
            </div>

            <div className={styles.kpiGrid}>
                <section className={styles.statCard}>
                    <h3>Chiffre d'Affaires (Jour)</h3>
                    <p className={styles.statValue}>{dailySummary ? dailySummary.chiffre_affaires.toFixed(2) : '0.00'} €</p>
                </section>

                <section className={styles.statCard}>
                    <h3>Couverts du jour</h3>
                    <p className={styles.statValue}>{data.couvertsJour}</p>
                </section>

                <section className={styles.statCard}>
                    <h3>Satisfaction Client</h3>
                    <div className={styles.ratingWrapper}>
                        <p className={`${styles.statValue} ${styles.ratingScore}`}>
                            {Number(avisStats.moyenne).toFixed(1)}
                        </p>
                        <span className={styles.maxScale}>/ 5</span>
                    </div>
                    <small className={styles.ratingCount}>Basé sur {avisStats.nombre} avis</small>
                </section>
            </div>

            <div className={styles.chartsGrid}>
                <section className={styles.chartSection}>
                    <h3>Répartition Paiements</h3>
                    <div className={styles.chartContainer}>
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie
                                    data={dailySummary ? Object.entries(dailySummary.repartition_paiement).map(([name, value]) => ({ name, value })) : []}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {dailySummary && Object.keys(dailySummary.repartition_paiement).map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={['#0088FE', '#00C49F', '#FFBB28', '#FF8042'][index % 4]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </section>

                <section className={styles.chartSection}>
                    <h3>Plats les plus vendus</h3>
                    <div className={styles.chartContainer}>
                        <ResponsiveContainer>
                            <BarChart data={data.platsPlusVendus} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" />
                                <YAxis type="category" dataKey="nom" width={100} tick={{ fontSize: 12 }} />
                                <Tooltip />
                                <Bar dataKey="quantite" fill="#4f46e5" name="Ventes" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </section>

                <section className={styles.chartSection}>
                    <h3>Heures d’affluence</h3>
                    <div className={styles.chartContainer}>
                        <ResponsiveContainer>
                            <AreaChart data={data.heuresAffluence} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorCommandes" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="heure" />
                                <YAxis />
                                <CartesianGrid strokeDasharray="3 3" />
                                <Tooltip />
                                <Area type="monotone" dataKey="commandes" stroke="#10b981" fillOpacity={1} fill="url(#colorCommandes)" name="Commandes" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </section>
            </div>

            <section className={styles.statSection}>
                <h3>Historique des commandes récentes</h3>
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Table</th>
                                <th>Plat</th>
                                <th>Date & Heure</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.historiqueCommandes.map((commande) => (
                                <tr key={commande.id}>
                                    <td>{commande.table}</td>
                                    <td>{commande.plat}</td>
                                    <td>{commande.date}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
};

export default Statistiques;
