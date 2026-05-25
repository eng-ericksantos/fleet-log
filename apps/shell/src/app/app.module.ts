import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import {
  provideHttpClient,
  withFetch,
  withInterceptors,
} from '@angular/common/http';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HomeComponent } from './home/home.component';
import { LatencyToastComponent } from './latency-toast/latency-toast.component';
import { latencyInterceptor } from './latency.interceptor';

@NgModule({
  declarations: [AppComponent, HomeComponent, LatencyToastComponent],
  imports: [BrowserModule, AppRoutingModule],
  providers: [provideHttpClient(withFetch(), withInterceptors([latencyInterceptor]))],
  bootstrap: [AppComponent],
})
export class AppModule {}
