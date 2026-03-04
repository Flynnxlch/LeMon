/**
 * Validation utility functions
 */

export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email) {
    return 'Email is required';
  }
  if (!emailRegex.test(email)) {
    return 'Please enter a valid email address';
  }
  return '';
};

export const validatePassword = (password, isRegistration = false) => {
  if (!password) {
    return 'Password is required';
  }
  if (isRegistration) {
    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/[0-9]/.test(password)) {
      return 'Password must contain at least one number';
    }
  }
  return '';
};

export const validateConfirmPassword = (password, confirmPassword) => {
  if (!confirmPassword) {
    return 'Please confirm your password';
  }
  if (password !== confirmPassword) {
    return 'Passwords do not match';
  }
  return '';
};

export const validateName = (name) => {
  if (!name) {
    return 'Name is required';
  }
  if (name.length < 2) {
    return 'Name must be at least 2 characters long';
  }
  return '';
};

export const getPasswordStrength = (password) => {
  if (!password) return { strength: 0, label: '', color: '' };
  
  let strength = 0;
  
  // Length check
  if (password.length >= 8) strength += 25;
  if (password.length >= 12) strength += 25;
  
  // Character variety checks
  if (/[a-z]/.test(password)) strength += 12.5;
  if (/[A-Z]/.test(password)) strength += 12.5;
  if (/[0-9]/.test(password)) strength += 12.5;
  if (/[^A-Za-z0-9]/.test(password)) strength += 12.5;
  
  let label = '';
  let color = '';
  
  if (strength <= 25) {
    label = 'Weak';
    color = 'red';
  } else if (strength <= 50) {
    label = 'Fair';
    color = 'orange';
  } else if (strength <= 75) {
    label = 'Good';
    color = 'yellow';
  } else {
    label = 'Strong';
    color = 'green';
  }
  
  return { strength, label, color };
};

export const validateSerialNumber = (serialNumber) => {
  if (!serialNumber) {
    return 'Serial number is required';
  }
  if (serialNumber.length < 5) {
    return 'Serial number must be at least 5 characters long';
  }
  return '';
};

export const validatePhoneNumber = (phone) => {
  if (!phone) {
    return 'Phone number is required';
  }
  const phoneRegex = /^[\d\s\-+()]+$/;
  if (!phoneRegex.test(phone)) {
    return 'Please enter a valid phone number';
  }
  if (phone.replace(/\D/g, '').length < 10) {
    return 'Phone number must be at least 10 digits';
  }
  return '';
};
