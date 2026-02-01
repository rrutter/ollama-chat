import { TestBed } from '@angular/core/testing';

import { SdPrompt } from './sd-prompt';

describe('SdPrompt', () => {
  let service: SdPrompt;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SdPrompt);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
