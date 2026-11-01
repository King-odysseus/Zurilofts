/**
 * auth: the guest sign-in and sign-up screens.
 *
 * Only the two auth pages read these keys. The older `login` and `register`
 * namespaces still sit in translations.js from before the domain split and are
 * left untouched; this file is what the pages now use.
 *
 * The sentences live here as whole lines so a translator reads the screen the
 * way a person does. The pages keep their markup and pass only words to the
 * translate function, so all of this copy changes from this one file.
 */
export const auth = {
  en: {
    auth: {
      // Sign in
      welcomeBack: 'Welcome back',
      signInSubtitle: 'Sign in to manage your stays, bookings and saved places.',
      googleSignInFailed: 'Google sign-in failed. Please try again.',
      emailLabel: 'Email address',
      // An example address, not a sentence: it stays an address in every language.
      emailPlaceholder: 'you@example.com',
      passwordLabel: 'Password',
      passwordPlaceholder: 'Enter your password',
      rememberMe: 'Remember me',
      forgotPassword: 'Forgot password?',
      signingIn: 'Signing in...',
      signIn: 'Sign in',
      orContinueWith: 'or continue with',
      continueWithGoogle: 'Continue with Google',
      newToZuriLofts: 'New to ZuriLofts?',
      createAccount: 'Create account',

      // Shared between both screens
      hidePassword: 'Hide password',
      showPassword: 'Show password',

      // Sign up
      title: 'Create your account',
      subtitle: "One account to book verified homes in Nairobi and to host your own. It's free to join.",
      accountType: 'Account type',
      travelling: 'Travelling',
      hosting: 'Hosting',
      firstNameLabel: 'First name',
      // Example names, not sentences: a Kenyan name reads the same in both languages.
      firstNamePlaceholder: 'Grace',
      lastNameLabel: 'Last name',
      lastNamePlaceholder: 'Wanjiru',
      // Different from the sign-in placeholder, so it gets its own key.
      newPasswordPlaceholder: '8+ characters',
      passwordHint: 'Use at least 8 characters with a number and an uppercase letter.',
      confirmPasswordLabel: 'Confirm password',
      confirmPasswordPlaceholder: 'Re-enter your password',
      profilePhoto: 'Profile photo',
      optional: '(optional)',
      selectedProfileAlt: 'Selected profile',
      agreeToPrefix: 'I agree to the',
      termsOfService: 'Terms of Service',
      andWord: 'and',
      privacyPolicy: 'Privacy Policy',
      creatingAccount: 'Creating account...',
      orSignUpWith: 'or sign up with',
      signUpWithGoogle: 'Sign up with Google',
      alreadyHaveAccount: 'Already have an account?',
      passwordsDoNotMatch: 'Passwords do not match',
      passwordTooShort: 'Password must be at least 8 characters',
    },
  },
  sw: {
    auth: {
      // Kuingia
      welcomeBack: 'Karibu tena',
      signInSubtitle: 'Ingia ili kusimamia makazi yako, uhifadhi wako na maeneo uliyoyahifadhi.',
      googleSignInFailed: 'Kuingia kwa Google kumeshindikana. Tafadhali jaribu tena.',
      emailLabel: 'Barua pepe',
      emailPlaceholder: 'you@example.com',
      passwordLabel: 'Nenosiri',
      passwordPlaceholder: 'Weka nenosiri lako',
      rememberMe: 'Nikumbuke',
      forgotPassword: 'Umesahau nenosiri?',
      signingIn: 'Inaingia...',
      signIn: 'Ingia',
      orContinueWith: 'au endelea na',
      continueWithGoogle: 'Endelea na Google',
      newToZuriLofts: 'Ni mara yako ya kwanza ZuriLofts?',
      createAccount: 'Fungua akaunti',

      hidePassword: 'Ficha nenosiri',
      showPassword: 'Onyesha nenosiri',

      // Kujisajili
      title: 'Fungua akaunti yako',
      subtitle: 'Akaunti moja ya kuhifadhi nyumba zilizothibitishwa Nairobi na ya kukaribisha wageni kwenye mali yako mwenyewe. Kujiunga ni bure.',
      accountType: 'Aina ya akaunti',
      travelling: 'Kusafiri',
      hosting: 'Ukaribishaji',
      firstNameLabel: 'Jina la kwanza',
      firstNamePlaceholder: 'Grace',
      lastNameLabel: 'Jina la mwisho',
      lastNamePlaceholder: 'Wanjiru',
      newPasswordPlaceholder: 'Herufi 8+',
      passwordHint: 'Tumia angalau herufi 8, pamoja na namba na herufi kubwa.',
      confirmPasswordLabel: 'Thibitisha nenosiri',
      confirmPasswordPlaceholder: 'Andika tena nenosiri lako',
      profilePhoto: 'Picha ya wasifu',
      optional: '(hiari)',
      selectedProfileAlt: 'Wasifu uliochaguliwa',
      agreeToPrefix: 'Nakubali',
      termsOfService: 'Masharti ya Huduma',
      andWord: 'na',
      privacyPolicy: 'Sera ya Faragha',
      creatingAccount: 'Inafungua akaunti...',
      orSignUpWith: 'au jisajili na',
      signUpWithGoogle: 'Jisajili na Google',
      alreadyHaveAccount: 'Tayari una akaunti?',
      passwordsDoNotMatch: 'Manenosiri hayalingani',
      passwordTooShort: 'Nenosiri linahitaji angalau herufi 8',
    },
  },
};
