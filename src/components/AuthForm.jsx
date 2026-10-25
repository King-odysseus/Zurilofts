import { useState } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { Alert, Button } from 'flowbite-react';
import { Eye, EyeOff, LockKeyhole } from 'lucide-react';
import GoogleIcon from './GoogleIcon.jsx';

/**
 * Form pieces shared by sign in and sign up. They live here so the auth screens
 * keep one definition of a field, an error and a divider: the design system
 * allows exactly three button shapes and one control height, and a page that
 * re-declares them is how the old stylesheets drifted apart.
 */

const CONTROL_CLASS =
  'block w-full rounded-lg border border-line bg-white text-sm text-ink placeholder:text-muted transition-colors focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10 disabled:bg-inset disabled:text-muted';

function AuthHeading({ title, subtitle }) {
  return (
    <div>
      <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.02em] text-ink">{title}</h1>
      {subtitle && <p className="mt-2 text-sm leading-relaxed text-muted">{subtitle}</p>}
    </div>
  );
}

AuthHeading.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
};

AuthHeading.defaultProps = { subtitle: '' };

/** Field with an optional leading icon, rendered inside a real label element. */
function AuthField({ id, label, hint, icon: Icon, trailing, ...inputProps }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-medium text-ink">{label}</label>
      <div className="relative">
        {Icon && (
          <Icon
            className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted"
            strokeWidth={1.8}
            aria-hidden="true"
          />
        )}
        <input
          id={id}
          className={`${CONTROL_CLASS} h-12 ${Icon ? 'pl-11' : 'pl-4'} ${trailing ? 'pr-11' : 'pr-4'}`}
          {...inputProps}
        />
        {trailing}
      </div>
      {hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

AuthField.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  hint: PropTypes.string,
  icon: PropTypes.elementType,
  trailing: PropTypes.node,
};

AuthField.defaultProps = { hint: '', icon: null, trailing: null };

/** Password field that owns its own show/hide state, so no page has to. */
function AuthPasswordField({ id, label, hint, ...inputProps }) {
  const [visible, setVisible] = useState(false);

  return (
    <AuthField
      id={id}
      label={label}
      hint={hint}
      icon={LockKeyhole}
      type={visible ? 'text' : 'password'}
      trailing={(
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-muted transition-colors hover:bg-inset hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
        >
          {visible
            ? <EyeOff className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden="true" />
            : <Eye className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden="true" />}
        </button>
      )}
      {...inputProps}
    />
  );
}

AuthPasswordField.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  hint: PropTypes.string,
};

AuthPasswordField.defaultProps = { hint: '' };

function AuthError({ children }) {
  if (!children) return null;
  return (
    <Alert color="failure" role="alert" className="rounded-lg py-2.5 text-[13px]">
      {children}
    </Alert>
  );
}

AuthError.propTypes = {
  children: PropTypes.node,
};

AuthError.defaultProps = { children: null };

function AuthDivider({ label }) {
  return (
    <div className="flex items-center gap-4 text-xs text-muted">
      <span className="h-px flex-1 bg-line" aria-hidden="true" />
      <span className="whitespace-nowrap">{label}</span>
      <span className="h-px flex-1 bg-line" aria-hidden="true" />
    </div>
  );
}

AuthDivider.propTypes = {
  label: PropTypes.string.isRequired,
};

/** Secondary provider button: white pill with a grey border, same height as the primary. */
function AuthGoogleButton({ href, label, onClick }) {
  return (
    <a
      href={href}
      onClick={onClick}
      className="flex min-h-[48px] w-full items-center justify-center gap-3 rounded-full border border-line bg-white px-6 text-sm font-semibold text-ink transition-colors hover:bg-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
    >
      <GoogleIcon className="h-[18px] w-[18px]" />
      {label}
    </a>
  );
}

AuthGoogleButton.propTypes = {
  href: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  onClick: PropTypes.func,
};

AuthGoogleButton.defaultProps = { onClick: undefined };

function AuthSwitchLine({ prompt, to, action }) {
  return (
    <p className="text-center text-[13px] text-muted">
      {prompt}{' '}
      <Link to={to} className="font-semibold text-ink underline underline-offset-4 hover:text-link">{action}</Link>
    </p>
  );
}

AuthSwitchLine.propTypes = {
  prompt: PropTypes.string.isRequired,
  to: PropTypes.string.isRequired,
  action: PropTypes.string.isRequired,
};

/** Primary submit: the single filled pill on the screen. */
function AuthSubmit({ submitting, idle, busy }) {
  return (
    <Button type="submit" pill size="lg" disabled={submitting} className="w-full">
      {submitting ? busy : idle}
    </Button>
  );
}

AuthSubmit.propTypes = {
  submitting: PropTypes.bool.isRequired,
  idle: PropTypes.node.isRequired,
  busy: PropTypes.string.isRequired,
};

export {
  AuthHeading,
  AuthField,
  AuthPasswordField,
  AuthError,
  AuthDivider,
  AuthGoogleButton,
  AuthSwitchLine,
  AuthSubmit,
};
