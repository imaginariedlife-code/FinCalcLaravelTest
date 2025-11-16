<?php

namespace Database\Seeders;

use App\Models\DepositRate;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DepositRatesSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * Historical deposit rates in Russia (average annual rate)
     */
    public function run(): void
    {
        $rates = [
            2010 => 9.0,
            2011 => 9.0,
            2012 => 9.0,
            2013 => 9.0,
            2014 => 9.0,
            2015 => 11.0,
            2016 => 11.0,
            2017 => 7.0,
            2018 => 7.0,
            2019 => 7.0,
            2020 => 5.0,
            2021 => 4.5,
            2022 => 8.0,
            2023 => 12.0,
            2024 => 16.0,
            2025 => 20.0,
        ];

        foreach ($rates as $year => $rate) {
            DepositRate::updateOrCreate(
                ['year' => $year],
                ['rate' => $rate]
            );
        }

        $this->command->info('Deposit rates seeded successfully!');
        $this->command->table(
            ['Year', 'Rate (%)'],
            collect($rates)->map(fn($rate, $year) => [$year, $rate])->values()
        );
    }
}
