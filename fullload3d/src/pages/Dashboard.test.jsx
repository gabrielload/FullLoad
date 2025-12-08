import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import Dashboard from './Dashboard';
import { BrowserRouter } from 'react-router-dom';
import React from 'react';

// Mock Firebase
vi.mock('../services/firebaseConfig', () => ({
    db: {},
    auth: {}
}));

vi.mock('firebase/firestore', () => ({
    collection: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    getDocs: vi.fn(() => Promise.resolve({ docs: [] })),
    orderBy: vi.fn(),
}));

// Mock Recharts
vi.mock('recharts', () => {
    return {
        ResponsiveContainer: ({ children }) => <div className="recharts-responsive-container">{children}</div>,
        BarChart: () => <div>BarChart</div>,
        PieChart: () => <div>PieChart</div>,
        AreaChart: () => <div>AreaChart</div>,
        Area: () => <div>Area</div>,
        Bar: () => <div>Bar</div>,
        Pie: () => <div>Pie</div>,
        Cell: () => <div>Cell</div>,
        XAxis: () => <div>XAxis</div>,
        YAxis: () => <div>YAxis</div>,
        CartesianGrid: () => <div>CartesianGrid</div>,
        Tooltip: () => <div>Tooltip</div>,
        Legend: () => <div>Legend</div>,
    };
});

// Mock ClientLayout (to avoid complex layout rendering)
vi.mock('../layouts/ClientLayout', () => ({
    default: ({ children }) => <div data-testid="client-layout">{children}</div>
}));

describe('Dashboard', () => {
    beforeEach(() => {
        // Mock localStorage
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => {
            if (key === 'empresaId') return 'test-empresa-id';
            if (key === 'userName') return 'Test User';
            return null;
        });
    });

    it('renders without crashing', () => {
        render(
            <BrowserRouter>
                <Dashboard />
            </BrowserRouter>
        );

        expect(screen.getByText(/Olá, Test User!/i)).toBeInTheDocument();
        expect(screen.getByText(/Bem-vindo ao seu painel/i)).toBeInTheDocument();
    });
});
