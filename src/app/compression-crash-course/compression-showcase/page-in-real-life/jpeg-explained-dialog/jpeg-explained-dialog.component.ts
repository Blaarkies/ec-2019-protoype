import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material';

@Component({
             selector: 'app-jpeg-explained-dialog',
             templateUrl: './jpeg-explained-dialog.component.html',
             styleUrls: ['./jpeg-explained-dialog.component.scss']
           })
export class JpegExplainedDialogComponent implements OnInit {

  constructor(public dialogRef: MatDialogRef<JpegExplainedDialogComponent>) {
  }

  onNoClick(): void {
    this.dialogRef.close();
  }

  ngOnInit() {
  }

}
