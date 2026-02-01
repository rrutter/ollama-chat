import { TestBed } from '@angular/core/testing';

import { SdImage } from './sd-image';

describe('SdImage', () => {
  let service: SdImage;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SdImage);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
