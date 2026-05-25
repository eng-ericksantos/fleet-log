import { HttpEventType, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { tap } from 'rxjs/operators';
import { LatencyToastService } from './latency-toast/latency-toast.service';

export const latencyInterceptor: HttpInterceptorFn = (req, next) => {
  const toastService = inject(LatencyToastService);
  const start = performance.now();

  return next(req).pipe(
    tap({
      next: (event) => {
        if (event.type === HttpEventType.Response) {
          const serverHeader = event.headers.get('X-Response-Time');
          const clientMs = Math.round(performance.now() - start);
          toastService.show(req.url, serverHeader, clientMs);
        }
      },
    }),
  );
};
