import '@testing-library/jest-dom/vitest';
import '@/env';

import {cleanup} from '@testing-library/react';
import {afterEach} from 'vitest';

afterEach(cleanup);
