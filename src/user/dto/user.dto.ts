import { Expose, Type } from 'class-transformer';

export class UserDto {
  @Expose()
  _id!: string;

  @Expose()
  email!: string;

  @Expose()
  phone!: string;

  @Expose()
  firstName!: string;

  @Expose()
  lastName!: string;

}

export class user {
  @Expose()
  _id!: string;

  @Expose()
  email!: string;

  @Expose()
  phone!: string;

  @Expose()
  firstName!: string;

  @Expose()
  lastName!: string;

}
export class LoginResponse {
  @Expose()
  @Type(() => user)
  result!: user;

  @Expose()
  accessToken!: string;
}
export class AllUserDto {
  @Expose()
  _id!: string;

  @Expose()
  firstName!: string;

  @Expose()
  lastName!: string;

  @Expose()
  userName!: string;
}
