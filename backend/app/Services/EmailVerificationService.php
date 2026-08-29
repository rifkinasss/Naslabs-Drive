<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;

class EmailVerificationService
{
    public function issueOtp(User $user): void
    {
        $user->loginOtpCodes()->whereNull('consumed_at')->update(['consumed_at' => now()]);
        $code = (string) random_int(100000, 999999);
        $user->loginOtpCodes()->create([
            'code_hash' => Hash::make($code),
            'expires_at' => now()->addMinutes(10),
        ]);

        Mail::raw("Your Cloud NL verification code is {$code}. It expires in 10 minutes. If you did not try to sign in, you can ignore this email.", function ($message) use ($user) {
            $message->to($user->email)->subject('Your Cloud NL verification code');
        });
    }
}
