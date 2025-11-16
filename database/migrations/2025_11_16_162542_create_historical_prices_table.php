<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('historical_prices', function (Blueprint $table) {
            $table->id();
            $table->string('ticker', 20)->index();
            $table->date('trade_date')->index();
            $table->decimal('open', 15, 4);
            $table->decimal('high', 15, 4);
            $table->decimal('low', 15, 4);
            $table->decimal('close', 15, 4);
            $table->bigInteger('volume')->nullable();
            $table->decimal('value', 20, 2)->nullable();
            $table->timestamps();

            // Composite unique index for ticker + trade_date
            $table->unique(['ticker', 'trade_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('historical_prices');
    }
};
