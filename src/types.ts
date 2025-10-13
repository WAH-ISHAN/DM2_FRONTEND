export type Expense = {
id: number;
date: string;
category: string;
description: string;
amount: number;
};

export type Budget = {
id: number;
category: string;
limit: number;
spent: number;
};

export type Saving = {
id: number;
name: string;
target: number;
current: number;
};

export type ReportSummary = {
monthly: [string, number][];
byCat: { k: string; v: number; pct: number }[];
forecast: number;
};